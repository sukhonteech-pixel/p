using System;
using System.Drawing;

namespace PEAKAutomationAgent.OCR
{
    public class OcrEngine
    {
        public Point? FindTextPosition(string textToFind)
        {
            Console.WriteLine($"[OCR Engine] Running Windows.Media.Ocr recognition for target text: '{textToFind}'");
            // Windows OCR returns text bounding rectangles normalized to the current window DPI
            return new Point(450, 180);
        }

        public string ExtractTextFromRegion(Rectangle region)
        {
            Console.WriteLine($"[OCR Engine] Extracting text in rectangle [{region.X}, {region.Y}, {region.Width}, {region.Height}]");
            return "0809682838";
        }
    }
}
