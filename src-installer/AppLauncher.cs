using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;

namespace UniversalFileToolkit.Launcher
{
    public static class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            try
            {
                string rootDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                string localAppDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "UniversalFileToolkit", "app");

                if (File.Exists(Path.Combine(rootDir, "package.json")))
                {
                    // Use current directory
                }
                else if (File.Exists(Path.Combine(rootDir, "..", "package.json")))
                {
                    rootDir = Path.GetFullPath(Path.Combine(rootDir, ".."));
                }
                else if (File.Exists(Path.Combine(localAppDir, "package.json")))
                {
                    rootDir = localAppDir;
                }

                EnsureNodeInPath();

                // 1. Start services in background
                string startScript = Path.Combine(rootDir, "scripts", "start-services.js");
                if (File.Exists(startScript))
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = "node",
                        Arguments = string.Format("\"{0}\"", startScript),
                        WorkingDirectory = rootDir,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        CreateNoWindow = true,
                        UseShellExecute = false
                    };
                    Process.Start(psi);
                }

                // 2. Wait for ports to become active
                int attempts = 0;
                while (attempts < 50)
                {
                    Thread.Sleep(300);
                    bool feReady = IsPortOpen("127.0.0.1", 3000);
                    if (feReady)
                    {
                        break;
                    }
                    attempts++;
                }

                Thread.Sleep(200);

                // 3. Open in Chrome App Mode or default browser
                LaunchInAppMode("http://localhost:3000");
            }
            catch (Exception)
            {
                try
                {
                    Process.Start("http://localhost:3000");
                }
                catch { }
            }
        }

        private static bool IsPortOpen(string host, int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(400);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void EnsureNodeInPath()
        {
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string nodeDir = Path.Combine(pf, "nodejs");
            if (Directory.Exists(nodeDir))
            {
                string path = Environment.GetEnvironmentVariable("PATH") ?? "";
                if (!path.Contains(nodeDir))
                {
                    Environment.SetEnvironmentVariable("PATH", nodeDir + ";" + path);
                }
            }
        }

        private static void LaunchInAppMode(string url)
        {
            string browserPath = FindBrowserExecutable();
            if (!string.IsNullOrEmpty(browserPath) && File.Exists(browserPath))
            {
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string profileDir = Path.Combine(appData, "UniversalFileToolkit", "ChromeProfile");
                if (!Directory.Exists(profileDir))
                {
                    Directory.CreateDirectory(profileDir);
                }

                var psi = new ProcessStartInfo
                {
                    FileName = browserPath,
                    Arguments = string.Format("--app={0} --user-data-dir=\"{1}\" --no-first-run --no-default-browser-check", url, profileDir),
                    UseShellExecute = true
                };
                Process.Start(psi);
            }
            else
            {
                Process.Start(url);
            }
        }

        private static string FindBrowserExecutable()
        {
            string[] possiblePaths = new string[]
            {
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe")
            };

            foreach (var path in possiblePaths)
            {
                if (File.Exists(path))
                {
                    return path;
                }
            }

            return null;
        }
    }
}
