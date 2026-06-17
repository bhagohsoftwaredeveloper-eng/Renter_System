using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;
using System.Text.Json;
using DPUruNet;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseWindowsService();
Directory.SetCurrentDirectory(AppContext.BaseDirectory);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Biometric Manager (Singleton)
builder.Services.AddSingleton<BiometricManager>();
builder.Services.AddSingleton<PrinterService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

app.MapGet("/status", (BiometricManager bio, PrinterService printer) => 
{
    // Use Windows Registry-based printer enumeration for reliable detection
    var windowsPrinters = printer.GetWindowsPrinterList();
    return Results.Ok(new { 
        biometric = new { isActive = bio.IsActive, readerCount = bio.ReaderCount },
        printers = windowsPrinters,
        ports = printer.GetAvailablePorts()
    });
});

app.MapGet("/health", (BiometricManager manager) => 
    Results.Ok(new { Status = "Running", HardwareReady = manager.IsActive, ReaderCount = manager.ReaderCount }));

app.MapGet("/capture", async (BiometricManager manager) =>
{
    try 
    {
        var template = await manager.CaptureFingerprint();
        return Results.Ok(new { status = "SUCCESS", template = template });
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/identify", ([FromBody] IdentifyRequest request, BiometricManager manager) =>
{
    try
    {
        int matchedIndex = manager.Identify(request.Probe, request.Candidates);
        return Results.Ok(new { status = "SUCCESS", matchedIndex = matchedIndex });
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/print", ([FromBody] PrintRequest request, PrinterService printer) =>
{
    Console.WriteLine($"[INFO] POST /print received for: {request.RenterName} to printer: {request.PrinterName ?? "DEFAULT"}");
    try
    {
        bool success = printer.PrintMealTicket(request.RenterName, request.MealType, request.Date, request.PrinterName, request.Floor, request.Expiration);
        if (success)
        {
            Console.WriteLine("[INFO] Print job sent successfully.");
            return Results.Ok(new { status = "SUCCESS" });
        }
        else
        {
            Console.WriteLine("[ERROR] Printing failed inside PrintMealTicket.");
            return Results.Problem("Printing failed. Check printer connection.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[ERROR] Exception in /print endpoint: {ex.Message}");
        return Results.Problem(ex.Message);
    }
});

app.Run("http://127.0.0.1:5003");

public record IdentifyRequest(string Probe, List<string> Candidates);
public record PrintRequest(string RenterName, string MealType, string Date, string? PrinterName, string? Floor, string? Expiration);

// --- Hardware Interface (DPUruNet SDK) ---
public class BiometricManager
{
    public bool IsActive { get; private set; }
    public int ReaderCount { get; private set; }

    // Keep the reader OPEN across captures. Opening EXCLUSIVE re-initializes the
    // USB device and is by far the slowest step; doing it ONCE instead of on every
    // scan is the single biggest read-speed win. _readerLock serializes captures so
    // the idle loop and an explicit scan never touch the same handle at once.
    private Reader? _openReader;
    private readonly object _readerLock = new object();

    public BiometricManager()
    {
        // Check availability at startup, but don't hold the reader open
        try
        {
            ReaderCollection readers = ReaderCollection.GetReaders();
            ReaderCount = readers.Count;
            IsActive = readers.Count > 0;
            if (IsActive)
                Console.WriteLine($"[INFO] U.are.U Reader Detected: {readers[0].Description.Name}");
            else
                Console.WriteLine("[WARN] No U.are.U Readers found.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] Failed to initialize DPUruNet SDK: {ex.Message}");
            IsActive = false;
        }
    }

    public async Task<string> CaptureFingerprint()
    {
        return await Task.Run(() =>
        {
            lock (_readerLock)
            {
                // Reuse the already-open reader (opened ONCE, see EnsureReaderOpen).
                // The idle loop calls this every cycle, so re-opening here would put
                // the slow USB init back on every scan — exactly what we removed.
                Reader reader = EnsureReaderOpen();

                CaptureResult captureResult = reader.Capture(
                    Constants.Formats.Fid.ANSI,
                    Constants.CaptureProcessing.DP_IMG_PROC_DEFAULT,
                    5000,
                    500);

                if (captureResult.ResultCode != Constants.ResultCode.DP_SUCCESS)
                {
                    // A non-success code is a hardware/communication fault (NOT a plain
                    // no-finger timeout). Drop the cached handle so the next call
                    // re-opens the reader fresh and recovers.
                    CloseReader();
                    throw new Exception($"Capture Error: {captureResult.ResultCode}");
                }

                if (captureResult.Data == null)
                    // Benign timeout: no finger within the window. Keep the reader OPEN
                    // so the next idle-loop capture starts instantly.
                    throw new Exception("Capture timed out or no data received.");

                Console.WriteLine("[INFO] Capture complete. Extracting FMD...");
                DataResult<Fmd> fmdResult = FeatureExtraction.CreateFmdFromFid(captureResult.Data, Constants.Formats.Fmd.ANSI);

                if (fmdResult.ResultCode == Constants.ResultCode.DP_SUCCESS && fmdResult.Data != null)
                    return Convert.ToBase64String(fmdResult.Data.Bytes);

                throw new Exception($"FMD Extraction Error: {fmdResult.ResultCode}");
            }
        });
    }

    // Lazily open the reader EXCLUSIVE and cache the handle. Subsequent captures
    // reuse it instead of paying the USB re-init cost on every scan.
    // Must be called while holding _readerLock.
    private Reader EnsureReaderOpen()
    {
        if (_openReader != null) return _openReader;

        ReaderCollection readers;
        try
        {
            readers = ReaderCollection.GetReaders();
            ReaderCount = readers.Count;
            IsActive = readers.Count > 0;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to enumerate readers: {ex.Message}");
        }

        if (readers.Count == 0) throw new Exception("HARDWARE NOT READY. ENSURE READER IS PLUGGED IN.");

        Reader reader = readers[0];
        Constants.ResultCode openResult = reader.Open(Constants.CapturePriority.DP_PRIORITY_EXCLUSIVE);
        if (openResult != Constants.ResultCode.DP_SUCCESS)
            throw new Exception($"Failed to open reader: {openResult}");

        Console.WriteLine("[INFO] Reader opened (persistent). Ready for captures.");
        _openReader = reader;
        return _openReader;
    }

    // Dispose and forget the cached reader so the next capture re-opens it.
    // Must be called while holding _readerLock.
    private void CloseReader()
    {
        if (_openReader == null) return;
        try { _openReader.Dispose(); } catch { }
        _openReader = null;
        IsActive = false;
        Console.WriteLine("[INFO] Reader closed (will re-open on next capture).");
    }

    public int Identify(string probeBase64, List<string> candidatesBase64)
    {
        if (string.IsNullOrEmpty(probeBase64) || candidatesBase64 == null || candidatesBase64.Count == 0)
            return -1;

        try
        {
            byte[] probeBytes = Convert.FromBase64String(probeBase64);
            DataResult<Fmd> probeResult = Importer.ImportFmd(probeBytes, Constants.Formats.Fmd.ANSI, Constants.Formats.Fmd.ANSI);
            if (probeResult.ResultCode != Constants.ResultCode.DP_SUCCESS || probeResult.Data == null)
                return -1;
            Fmd probeFmd = probeResult.Data;

            List<Fmd> candidateFmds = new List<Fmd>();
            List<int> originalIndexes = new List<int>();
            
            for (int i = 0; i < candidatesBase64.Count; i++)
            {
                try
                {
                    if (string.IsNullOrEmpty(candidatesBase64[i])) continue;
                    byte[] cBytes = Convert.FromBase64String(candidatesBase64[i]);
                    DataResult<Fmd> cResult = Importer.ImportFmd(cBytes, Constants.Formats.Fmd.ANSI, Constants.Formats.Fmd.ANSI);
                    if (cResult.ResultCode == Constants.ResultCode.DP_SUCCESS && cResult.Data != null)
                    {
                        candidateFmds.Add(cResult.Data);
                        originalIndexes.Add(i);
                    }
                }
                catch
                {
                    // Skip invalid templates
                }
            }

            if (candidateFmds.Count == 0) return -1;

            // Identify 1:N
            // Threshold for 1/100,000 is 21474
            IdentifyResult result = Comparison.Identify(probeFmd, 0, candidateFmds, 21474, 1);

            if (result.ResultCode == Constants.ResultCode.DP_SUCCESS && result.Indexes.Length > 0)
            {
                // result.Indexes is int[][]
                int matchedInternalIndex = result.Indexes[0][0];
                return originalIndexes[matchedInternalIndex];
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] Identification failed: {ex.Message}");
        }

        return -1;
    }
}
