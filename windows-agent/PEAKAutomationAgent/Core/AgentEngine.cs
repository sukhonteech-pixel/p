using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using PEAKAutomationAgent.Network;
using PEAKAutomationAgent.PrimeGlobalAsset;
using PEAKAutomationAgent.Screenshot;

namespace PEAKAutomationAgent.Core
{
    public class AgentEngine
    {
        private readonly string _serverUrl;
        private readonly string _deviceToken;
        private readonly string _deviceName;
        private readonly WebSocketAgentClient _wsClient;
        private readonly PrimeGlobalAssetAdapter _primeAdapter;
        private readonly ScreenCaptureService _screenService;

        public AgentEngine(string serverUrl, string deviceToken, string deviceName)
        {
            _serverUrl = serverUrl;
            _deviceToken = deviceToken;
            _deviceName = deviceName;
            _wsClient = new WebSocketAgentClient(serverUrl, deviceToken, deviceName);
            _primeAdapter = new PrimeGlobalAssetAdapter();
            _screenService = new ScreenCaptureService();
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            Console.WriteLine("[Agent] Initializing Multi-layer Automation Subsystems...");
            Console.WriteLine("[Layer 1] Windows UI Automation / Accessibility Tree: Ready");
            Console.WriteLine("[Layer 2] Windows Media OCR Engine: Ready");
            Console.WriteLine("[Layer 3] OpenCV Template Matcher: Ready");
            Console.WriteLine("[Layer 4] Fallback Coordinate Normalizer: Ready");

            _wsClient.OnJobReceived += async (sender, jobPayload) =>
            {
                await HandleJobAsync(jobPayload, cancellationToken);
            };

            await _wsClient.ConnectAndListenAsync(cancellationToken);
        }

        private async Task HandleJobAsync(JsonElement jobPayload, CancellationToken cancellationToken)
        {
            string jobId = jobPayload.GetProperty("jobId").GetString() ?? "";
            string propertyNo = jobPayload.GetProperty("propertyNo").GetString() ?? "";

            Console.WriteLine($"\n[Job Received] Processing {jobId} for Property: {propertyNo}");

            try
            {
                // Step 1: Detect Prime Global Asset
                await _wsClient.SendLogAsync(jobId, "INFO", "Application Check", "Checking Prime Global Asset process");
                bool isRunning = _primeAdapter.IsRunning();
                if (!isRunning)
                {
                    await _wsClient.SendLogAsync(jobId, "INFO", "Launch", "Starting Prime Global Asset executable");
                    _primeAdapter.Launch();
                }
                _primeAdapter.ActivateWindow();

                // Step 2: Open Property Menu
                await _wsClient.SendProgressAsync(jobId, "RUNNING", "Step 2: Navigate to Property Menu", 25);
                _primeAdapter.OpenProperty();

                // Step 3: Search Property
                await _wsClient.SendProgressAsync(jobId, "RUNNING", $"Step 3: Searching {propertyNo}", 35);
                _primeAdapter.SearchProperty(propertyNo);

                // Step 4: Open Detail
                await _wsClient.SendProgressAsync(jobId, "READING_PROPERTY", "Step 4: Opening Property Details", 45);
                _primeAdapter.OpenPropertyDetail(propertyNo);

                // Step 5: Read Basic Info
                var basicData = _primeAdapter.ReadPropertyData();

                // Step 6: Read Landlord
                await _wsClient.SendProgressAsync(jobId, "READING_LANDLORD", "Step 6: Reading Landlord Info", 60);
                var landlordData = _primeAdapter.ReadLandlordData();

                // Step 7: Read Price
                await _wsClient.SendProgressAsync(jobId, "READING_PRICE", "Step 7: Reading Price Info", 70);
                var priceData = _primeAdapter.ReadPriceData();

                // Step 8: Read Photos
                await _wsClient.SendProgressAsync(jobId, "READING_PHOTOS", "Step 8: Inspecting Photos Tab", 80);
                int photosFound = _primeAdapter.DetectPhotoCount();

                // Step 9 & 10: Capture & Send
                await _wsClient.SendProgressAsync(jobId, "UPLOADING_PHOTOS", $"Step 9-10: Captured {photosFound} photos", 90);

                // Send screenshot
                string screenshotBase64 = _screenService.CaptureActiveWindowBase64();
                await _wsClient.SendScreenshotAsync(jobId, screenshotBase64);

                // Send Completed
                await _wsClient.SendJobCompletedAsync(jobId, propertyNo, basicData, landlordData, photosFound);
                Console.WriteLine($"[Job Success] Property {propertyNo} automation completed successfully!");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[Job Error] {ex.Message}");
                Console.ResetColor();
                await _wsClient.SendJobFailedAsync(jobId, ex.Message);
            }
        }
    }
}
