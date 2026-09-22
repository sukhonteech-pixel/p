using System;
using System.Threading;
using System.Threading.Tasks;
using PEAKAutomationAgent.Core;

namespace PEAKAutomationAgent
{
    internal class Program
    {
        private static async Task Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;
            Console.WriteLine("==========================================================");
            Console.WriteLine("   PEAK AUTOMATION DESKTOP AGENT v1.0.0 (Windows)        ");
            Console.WriteLine("   Prime Global Asset Multi-Layer Automation Engine       ");
            Console.WriteLine("==========================================================");

            string serverUrl = Environment.GetEnvironmentVariable("PEAK_SERVER_URL") ?? "ws://localhost:3000/ws";
            string deviceToken = Environment.GetEnvironmentVariable("PEAK_DEVICE_TOKEN") ?? "pk_dev_office_pc_2026_authorized";
            string deviceName = Environment.GetEnvironmentVariable("PEAK_DEVICE_NAME") ?? Environment.MachineName;

            Console.WriteLine($"[Config] Server URL:    {serverUrl}");
            Console.WriteLine($"[Config] Device Name:   {deviceName}");
            Console.WriteLine($"[Config] Authorization: [Configured]");
            Console.WriteLine();

            var agent = new AgentEngine(serverUrl, deviceToken, deviceName);
            var cts = new CancellationTokenSource();

            Console.CancelKeyPress += (s, e) =>
            {
                e.Cancel = true;
                Console.WriteLine("\n[Shutdown] Stopping Agent gracefully...");
                cts.Cancel();
            };

            try
            {
                await agent.StartAsync(cts.Token);
            }
            catch (OperationCanceledException)
            {
                Console.WriteLine("[Shutdown] Agent stopped.");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[Fatal Error] {ex.Message}");
                Console.ResetColor();
            }
        }
    }
}
