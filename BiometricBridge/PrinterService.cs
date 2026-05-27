using System.Runtime.InteropServices;
using System.Text;
using System.Linq;
using System.Collections.Generic;
using Microsoft.Win32;

public class PrinterService : IDisposable
{
    private IntPtr _hPrinter = IntPtr.Zero;
    private const string DllPath = "libs\\printer.sdk.dll";

    #region Manual Loading Helper
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern IntPtr LoadLibrary(string lpFileName);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GetProcAddress(IntPtr hModule, string procName);

    [DllImport("kernel32.dll")]
    private static extern bool FreeLibrary(IntPtr hModule);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl, CharSet = CharSet.Unicode)]
    private delegate IntPtr InitPrinterDelegate(string model);
    #endregion

    #region P/Invoke
    // ... we will keep others as static for now but use Cdecl as it's more likely ...
    [DllImport(DllPath, EntryPoint = "InitPrinter", CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Unicode)]
    private static extern IntPtr InitPrinter(string model);

    [DllImport(DllPath, EntryPoint = "ReleasePrinter", CallingConvention = CallingConvention.Cdecl)]
    private static extern int ReleasePrinter(IntPtr handle);

    [DllImport(DllPath, EntryPoint = "OpenPort", CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Unicode)]
    private static extern int OpenPort(IntPtr handle, string setting);

    [DllImport(DllPath, EntryPoint = "ClosePort", CallingConvention = CallingConvention.Cdecl)]
    private static extern int ClosePort(IntPtr handle);

    [DllImport(DllPath, EntryPoint = "WriteData", CallingConvention = CallingConvention.Cdecl)]
    private static extern int WriteData(IntPtr handle, byte[] buffer, int size);

    [DllImport(DllPath, EntryPoint = "PrinterInitialize", CallingConvention = CallingConvention.Cdecl)]
    private static extern int PrinterInitialize(IntPtr handle);

    [DllImport(DllPath, EntryPoint = "PrintSelfTest", CallingConvention = CallingConvention.Cdecl)]
    private static extern int PrintSelfTest(IntPtr handle);

    [DllImport(DllPath, EntryPoint = "ListPrinters", CallingConvention = CallingConvention.Cdecl)]
    private static extern int ListPrinters(byte[] buffer, uint size, ref uint needSize);

    [DllImport(DllPath, EntryPoint = "ListComPorts", CallingConvention = CallingConvention.Cdecl)]
    private static extern int ListComPorts(byte[] buffer, uint size, ref uint needSize);

    [DllImport(DllPath, EntryPoint = "SetAlign", CallingConvention = CallingConvention.Cdecl)]
    private static extern int SetAlign(IntPtr handle, int align);

    [DllImport(DllPath, EntryPoint = "PrintText", CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    private static extern int PrintText(IntPtr handle, string data, int alignment, int textSize);

    [DllImport(DllPath, EntryPoint = "FeedLine", CallingConvention = CallingConvention.Cdecl)]
    private static extern int FeedLine(IntPtr handle, int lines);

    [DllImport(DllPath, EntryPoint = "CutPaper", CallingConvention = CallingConvention.Cdecl)]
    private static extern int CutPaper(IntPtr handle, int cutMode);

    [DllImport(DllPath, EntryPoint = "SetTextBold", CallingConvention = CallingConvention.Cdecl)]
    private static extern int SetTextBold(IntPtr handle, int bold);

    #region WinSpool P/Invoke (Fallback)
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName = "";
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile = null;
        [MarshalAs(UnmanagedType.LPStr)] public string pDatatype = "";
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
    #endregion
    #endregion

    public PrinterService()
    {
        Initialize();
    }

    private void Initialize()
    {
        try
        {
            Console.WriteLine("[INFO] Initializing Printer SDK...");
            // Try specific then generic
            _hPrinter = InitPrinter("XP-58"); 
            if (_hPrinter == IntPtr.Zero) _hPrinter = InitPrinter("XP-58-P");
            if (_hPrinter == IntPtr.Zero) _hPrinter = InitPrinter(null);
            
            if (_hPrinter != IntPtr.Zero)
            {
                Console.WriteLine($"[INFO] Printer SDK Initialized. Handle: {_hPrinter}");
            }
            else
            {
                Console.WriteLine("[ERROR] Failed to initialize printer handle (NULL).");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FATAL] Printer initialization failure: {ex.Message}");
        }
    }

    public string GetAvailablePrinters()
    {
        uint needSize = 0;
        ListPrinters(null, 0, ref needSize);
        if (needSize > 0)
        {
            byte[] buffer = new byte[needSize];
            ListPrinters(buffer, needSize, ref needSize);
            string raw = Encoding.Unicode.GetString(buffer);
            var names = raw.Split('\0', StringSplitOptions.RemoveEmptyEntries);
            return string.Join(", ", names);
        }
        return "None found";
    }

    public List<string> GetWindowsPrinterList()
    {
        var printers = new List<string>();
        try
        {
            const string printerKey = @"SYSTEM\CurrentControlSet\Control\Print\Printers";
            using var key = Registry.LocalMachine.OpenSubKey(printerKey);
            if (key != null)
            {
                foreach (var name in key.GetSubKeyNames())
                {
                    printers.Add(name);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[WARN] Registry printer enumeration failed: {ex.Message}");
        }
        return printers;
    }

    public List<string> GetPrinterList()
    {
        uint needSize = 0;
        ListPrinters(null, 0, ref needSize);
        if (needSize > 0)
        {
            byte[] buffer = new byte[needSize];
            ListPrinters(buffer, needSize, ref needSize);
            string raw = Encoding.Unicode.GetString(buffer);
            return raw.Split('\0', StringSplitOptions.RemoveEmptyEntries).ToList();
        }
        return new List<string>();
    }

    public string GetAvailablePorts()
    {
        uint needSize = 0;
        ListComPorts(null, 0, ref needSize);
        if (needSize > 0)
        {
            byte[] buffer = new byte[needSize];
            ListComPorts(buffer, needSize, ref needSize);
            string raw = Encoding.Unicode.GetString(buffer);
            var names = raw.Split('\0', StringSplitOptions.RemoveEmptyEntries);
            return string.Join(", ", names);
        }
        return "None found";
    }

    public bool PrintMealTicket(string renterName, string mealType, string date, string? requestedPrinter = null, string? floor = null, string? expiration = null)
    {
        Console.WriteLine($"[INFO] Request to print for: {renterName} (Meal: {mealType}, Floor: {floor}, Exp: {expiration})");
        string targetPrinter = string.IsNullOrWhiteSpace(requestedPrinter) ? "XP-58-P" : requestedPrinter;

        // Try WinSpool (Direct Windows Printing) for target Printer
        try
        {
            Console.WriteLine($"[INFO] Attempting Direct Windows Spooler Printing ({targetPrinter})...");
            if (SendRawToPrinter(targetPrinter, renterName, mealType, date, floor, expiration))
            {
                Console.WriteLine("[SUCCESS] Printed via Windows Spooler.");
                return true;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DEBUG] WinSpool attempt failed: {ex.Message}");
        }

        // --- SDK FALLBACK (kept as backup) ---
        if (_hPrinter == IntPtr.Zero) Initialize();
        if (_hPrinter == IntPtr.Zero) return false;

        try
        {
            var portAttempts = new List<string>();
            if (!string.IsNullOrWhiteSpace(requestedPrinter))
                portAttempts.Add(requestedPrinter);
            portAttempts.AddRange(new[] { "USB002", "XP-58-P", "USB001", "XP-58" });
            
            int openResult = -1;
            string successfulPort = "";

            foreach (var port in portAttempts.Distinct())
            {
                if (string.IsNullOrWhiteSpace(port) || port == "UnknownPrinter") continue;
                openResult = OpenPort(_hPrinter, port);
                if (openResult >= 0) 
                {
                    successfulPort = port;
                    break;
                }
            }

            if (openResult >= 0)
            {
                PrinterInitialize(_hPrinter);
                SetAlign(_hPrinter, 1);
                PrintText(_hPrinter, "ZENITH TOWERS\n", 1, 1);
                PrintText(_hPrinter, "MEAL TICKET\n", 1, 0);
                SetAlign(_hPrinter, 0);
                var sdkBody = new StringBuilder();
                sdkBody.Append($"NAME: {renterName}\n");
                if (!string.IsNullOrWhiteSpace(floor)) sdkBody.Append($"FLOOR: {floor}\n");
                sdkBody.Append($"MEAL: {mealType}\n");
                sdkBody.Append($"DATE: {date}\n");
                if (!string.IsNullOrWhiteSpace(expiration)) sdkBody.Append($"EXPIRES: {expiration}\n");
                PrintText(_hPrinter, sdkBody.ToString(), 0, 0);
                FeedLine(_hPrinter, 4);
                CutPaper(_hPrinter, 0);
                ClosePort(_hPrinter);
                return true;
            }
            return false;
        }
        catch
        {
            return false;
        }
    }

    private bool SendRawToPrinter(string printerName, string renterName, string mealType, string date, string? floor = null, string? expiration = null)
    {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        bool bSuccess = false;

        di.pDocName = "Meal Ticket";
        di.pDatatype = "RAW";

        if (OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
        {
            if (StartDocPrinter(hPrinter, 1, di))
            {
                if (StartPagePrinter(hPrinter))
                {
                    // ESC/POS Commands
                    byte[] escInit = { 0x1B, 0x40 }; // Initialize
                    byte[] escCenter = { 0x1B, 0x61, 0x01 }; // Align Center
                    byte[] escLarge = { 0x1D, 0x21, 0x11 }; // Double height & width
                    byte[] escNormal = { 0x1D, 0x21, 0x00 }; // Normal
                    byte[] escLeft = { 0x1B, 0x61, 0x00 }; // Align Left
                    byte[] escCut = { 0x1D, 0x56, 0x41, 0x00 }; // Cut

                    StringBuilder sb = new StringBuilder();
                    sb.AppendLine("MEAL TICKET");
                    sb.AppendLine("--------------------------------");
                    sb.AppendLine($"DATE: {date}");
                    sb.AppendLine($"NAME: {renterName.ToUpper()}");
                    if (!string.IsNullOrWhiteSpace(floor))
                        sb.AppendLine($"FLOOR: {floor.ToUpper()}");
                    sb.AppendLine($"MEAL: {mealType.ToUpper()}");
                    if (!string.IsNullOrWhiteSpace(expiration))
                        sb.AppendLine($"EXPIRES: {expiration.ToUpper()}");
                    sb.AppendLine("--------------------------------");
                    sb.AppendLine("\n\n\n\n");

                    byte[] textData = Encoding.ASCII.GetBytes(sb.ToString());

                    List<byte> payload = new List<byte>();
                    payload.AddRange(escInit);
                    payload.AddRange(escCenter);
                    payload.AddRange(escLarge);
                    payload.AddRange(Encoding.ASCII.GetBytes("ZENITH TOWERS\n"));
                    payload.AddRange(escNormal);
                    payload.AddRange(escCenter);
                    payload.AddRange(Encoding.ASCII.GetBytes("\n"));
                    payload.AddRange(escLeft);
                    payload.AddRange(textData);
                    payload.AddRange(escCut);

                    byte[] finalBuffer = payload.ToArray();
                    IntPtr pBytes = Marshal.AllocCoTaskMem(finalBuffer.Length);
                    Marshal.Copy(finalBuffer, 0, pBytes, finalBuffer.Length);
                    
                    Int32 dwWritten = 0;
                    bSuccess = WritePrinter(hPrinter, pBytes, finalBuffer.Length, out dwWritten);
                    
                    Marshal.FreeCoTaskMem(pBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return bSuccess;
    }

    public void Dispose()
    {
        if (_hPrinter != IntPtr.Zero)
        {
            ReleasePrinter(_hPrinter);
            _hPrinter = IntPtr.Zero;
        }
    }
}
