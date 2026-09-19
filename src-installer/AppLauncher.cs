using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;
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
                else
                {
                    // If system is not yet installed, launch Setup.exe
                    string setupExe = Path.Combine(rootDir, "Setup.exe");
                    if (File.Exists(setupExe))
                    {
                        Process.Start(setupExe);
                        return;
                    }
                    string localSetup = Path.Combine(localAppDir, "Setup.exe");
                    if (File.Exists(localSetup))
                    {
                        Process.Start(localSetup);
                        return;
                    }
                }

                // 1. Force kill any existing/stale processes on ports 3000 and 3001
                KillProcessOnPort(3000);
                KillProcessOnPort(3001);
                Thread.Sleep(300);

                EnsureNodeInPath();

                // 2. Start services in silent background mode
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
                else
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c npm run start:web",
                        WorkingDirectory = rootDir,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        CreateNoWindow = true,
                        UseShellExecute = false
                    };
                    Process.Start(psi);
                }

                // 3. Wait for both backend (3001) and frontend (3000) to become responsive
                int attempts = 0;
                while (attempts < 60)
                {
                    Thread.Sleep(400);
                    bool feReady = IsPortOpen("127.0.0.1", 3000);
                    bool beReady = IsPortOpen("127.0.0.1", 3001);
                    if (feReady && beReady)
                    {
                        break;
                    }
                    attempts++;
                }

                // Brief pause to allow routes registration
                Thread.Sleep(250);

                // 4. Open in Chrome App Mode / Edge App Mode
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

        private static void KillProcessOnPort(int port)
        {
            try
            {
                var psi = new ProcessStartInfo("cmd.exe", string.Format("/c for /f \"tokens=5\" %a in ('netstat -aon ^| findstr \":{0} \" ^| findstr \"LISTENING\"') do taskkill /f /pid %a", port))
                {
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                using (var p = Process.Start(psi))
                {
                    p.WaitForExit(2000);
                }
            }
            catch { }
        }

        private static bool IsPortOpen(string host, int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(500);
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
