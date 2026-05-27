using System;
using System.Runtime.InteropServices;
using System.Text;

class PrinterTest {
    private const string DllPath = "libs\\printer.sdk.dll";

    [DllImport(DllPath, EntryPoint = "InitPrinter", CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    private static extern IntPtr InitPrinterCdeclAnsi(string model);

    [DllImport(DllPath, EntryPoint = "InitPrinter", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    private static extern IntPtr InitPrinterStdAnsi(string model);

    [DllImport(DllPath, EntryPoint = "InitPrinter", CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Unicode)]
    private static extern IntPtr InitPrinterCdeclUni(string model);

    [DllImport(DllPath, EntryPoint = "InitPrinter", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Unicode)]
    private static extern IntPtr InitPrinterStdUni(string model);

    /*
    static void Main() {
        Console.WriteLine("--- PRINTER SDK P/INVOKE TEST ---");
        
        try {
            Console.WriteLine("Attempting Cdecl + Ansi...");
            IntPtr h1 = InitPrinterCdeclAnsi("XP-58-P");
            Console.WriteLine($"Result: {h1}");
        } catch (Exception ex) { Console.WriteLine($"CdeclAnsi Fail: {ex.Message}"); }

        try {
            Console.WriteLine("Attempting StdCall + Ansi...");
            IntPtr h2 = InitPrinterStdAnsi("XP-58-P");
            Console.WriteLine($"Result: {h2}");
        } catch (Exception ex) { Console.WriteLine($"StdAnsi Fail: {ex.Message}"); }

        try {
            Console.WriteLine("Attempting Cdecl + Unicode...");
            IntPtr h3 = InitPrinterCdeclUni("XP-58-P");
            Console.WriteLine($"Result: {h3}");
        } catch (Exception ex) { Console.WriteLine($"CdeclUni Fail: {ex.Message}"); }

        try {
            Console.WriteLine("Attempting StdCall + Unicode...");
            IntPtr h4 = InitPrinterStdUni("XP-58-P");
            Console.WriteLine($"Result: {h4}");
        } catch (Exception ex) { Console.WriteLine($"StdUni Fail: {ex.Message}"); }

        Console.WriteLine("Test Complete.");
    }
    */
}
