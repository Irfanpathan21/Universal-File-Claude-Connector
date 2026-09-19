using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace UniversalFileToolkit.Installer
{
    public class SetupWizardApp : Application
    {
        [STAThread]
        public static void Main(string[] args)
        {
            var app = new SetupWizardApp();
            var window = new SetupWindow();
            app.Run(window);
        }
    }

    public class CommandResult
    {
        public int ExitCode { get; set; }
        public string Output { get; set; }

        public CommandResult(int exitCode, string output)
        {
            ExitCode = exitCode;
            Output = output;
        }
    }

    public class SetupWindow : Window
    {
        private string rootDir;
        private string targetInstallDir;
        private bool isStandaloneInstaller;
        private TextBlock txtNodeStatus;
        private TextBlock txtDepStatus;
        private TextBlock txtPath;
        private CheckBox chkInstall;
        private CheckBox chkShortcut;
        private CheckBox chkClaude;
        private CheckBox chkLaunch;
        private TextBox txtLog;
        private ScrollViewer scrollLog;
        private ProgressBar progressBar;
        private TextBlock lblStatus;
        private TextBlock lblPercent;
        private Button btnInstall;
        private Button btnLaunch;
        private Button btnClose;

        public SetupWindow()
        {
            string currentBase = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            targetInstallDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "UniversalFileToolkit", "app");

            if (File.Exists(Path.Combine(currentBase, "package.json")))
            {
                rootDir = currentBase;
                isStandaloneInstaller = false;
            }
            else if (File.Exists(Path.Combine(currentBase, "..", "package.json")))
            {
                rootDir = Path.GetFullPath(Path.Combine(currentBase, ".."));
                isStandaloneInstaller = false;
            }
            else if (File.Exists(Path.Combine(targetInstallDir, "package.json")))
            {
                rootDir = targetInstallDir;
                isStandaloneInstaller = false;
            }
            else
            {
                rootDir = targetInstallDir;
                isStandaloneInstaller = true;
            }

            InitializeComponent();
            CheckInitialEnvironment();
        }

        private void InitializeComponent()
        {
            Title = "Universal File Toolkit — Setup & Installation";
            Width = 760;
            Height = 670;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            ResizeMode = ResizeMode.NoResize;
            Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#f8fafc"));
            FontFamily = new FontFamily("Segoe UI, -apple-system, BlinkMacSystemFont, Arial");

            var mainBorder = new Border
            {
                Background = Brushes.White,
                Margin = new Thickness(16),
                CornerRadius = new CornerRadius(8),
                BorderBrush = (Brush)new BrushConverter().ConvertFromString("#e2e8f0"),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(24)
            };

            var mainGrid = new Grid();
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 0 Header
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 1 System Status Info
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 2 Options (Big checkboxes)
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // 3 Log
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 4 Progress
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 5 Action Buttons

            // --- 0. Header (Clean Blue & White) ---
            var headerGrid = new Grid { Margin = new Thickness(0, 0, 0, 16) };
            headerGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            headerGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            var iconBorder = new Border
            {
                Width = 52,
                Height = 52,
                CornerRadius = new CornerRadius(10),
                Background = (Brush)new BrushConverter().ConvertFromString("#1d4ed8"), // Royal Blue
                Margin = new Thickness(0, 0, 16, 0)
            };
            var iconText = new TextBlock
            {
                Text = "U",
                Foreground = Brushes.White,
                FontSize = 26,
                FontWeight = FontWeights.Bold,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            iconBorder.Child = iconText;
            Grid.SetColumn(iconBorder, 0);

            var titleStack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
            var titleText = new TextBlock
            {
                Text = "Universal File Toolkit",
                Foreground = (Brush)new BrushConverter().ConvertFromString("#0f172a"),
                FontSize = 22,
                FontWeight = FontWeights.Bold
            };
            var subtitleText = new TextBlock
            {
                Text = "Windows Application & Enterprise Service Setup",
                Foreground = (Brush)new BrushConverter().ConvertFromString("#475569"),
                FontSize = 13,
                Margin = new Thickness(0, 2, 0, 0)
            };
            titleStack.Children.Add(titleText);
            titleStack.Children.Add(subtitleText);
            Grid.SetColumn(titleStack, 1);

            headerGrid.Children.Add(iconBorder);
            headerGrid.Children.Add(titleStack);
            Grid.SetRow(headerGrid, 0);
            mainGrid.Children.Add(headerGrid);

            // --- 1. Dynamic Environment Detection Card ---
            var statusCard = new Border
            {
                Background = (Brush)new BrushConverter().ConvertFromString("#f8fafc"),
                BorderBrush = (Brush)new BrushConverter().ConvertFromString("#e2e8f0"),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(14, 10, 14, 10),
                Margin = new Thickness(0, 0, 0, 14)
            };
            var statusGrid = new Grid();
            statusGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            statusGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            statusGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            statusGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            statusGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            statusGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            var lblNode = new TextBlock { Text = "Node.js Runtime:", FontWeight = FontWeights.SemiBold, Foreground = (Brush)new BrushConverter().ConvertFromString("#334155"), FontSize = 12, Margin = new Thickness(0, 0, 8, 4) };
            txtNodeStatus = new TextBlock { Text = "Checking...", Foreground = (Brush)new BrushConverter().ConvertFromString("#1d4ed8"), FontSize = 12, FontWeight = FontWeights.Medium, Margin = new Thickness(0, 0, 16, 4) };
            var lblDep = new TextBlock { Text = "System Package:", FontWeight = FontWeights.SemiBold, Foreground = (Brush)new BrushConverter().ConvertFromString("#334155"), FontSize = 12, Margin = new Thickness(0, 0, 8, 4) };
            txtDepStatus = new TextBlock { Text = "Checking...", Foreground = (Brush)new BrushConverter().ConvertFromString("#1d4ed8"), FontSize = 12, FontWeight = FontWeights.Medium, Margin = new Thickness(0, 0, 0, 4) };

            Grid.SetRow(lblNode, 0); Grid.SetColumn(lblNode, 0);
            Grid.SetRow(txtNodeStatus, 0); Grid.SetColumn(txtNodeStatus, 1);
            Grid.SetRow(lblDep, 0); Grid.SetColumn(lblDep, 2);
            Grid.SetRow(txtDepStatus, 0); Grid.SetColumn(txtDepStatus, 3);

            var lblLoc = new TextBlock { Text = "Install Directory:", FontWeight = FontWeights.SemiBold, Foreground = (Brush)new BrushConverter().ConvertFromString("#334155"), FontSize = 12, Margin = new Thickness(0, 2, 8, 0) };
            txtPath = new TextBlock { Text = rootDir, Foreground = (Brush)new BrushConverter().ConvertFromString("#64748b"), FontSize = 12, TextTrimming = TextTrimming.CharacterEllipsis, Margin = new Thickness(0, 2, 0, 0) };
            Grid.SetRow(lblLoc, 1); Grid.SetColumn(lblLoc, 0);
            Grid.SetRow(txtPath, 1); Grid.SetColumn(txtPath, 1);
            Grid.SetColumnSpan(txtPath, 3);

            statusGrid.Children.Add(lblNode);
            statusGrid.Children.Add(txtNodeStatus);
            statusGrid.Children.Add(lblDep);
            statusGrid.Children.Add(txtDepStatus);
            statusGrid.Children.Add(lblLoc);
            statusGrid.Children.Add(txtPath);
            statusCard.Child = statusGrid;
            Grid.SetRow(statusCard, 1);
            mainGrid.Children.Add(statusCard);

            // --- 2. Options (Big checkboxes) ---
            var optCard = new Border
            {
                Background = Brushes.White,
                BorderBrush = (Brush)new BrushConverter().ConvertFromString("#e2e8f0"),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(14, 10, 14, 10),
                Margin = new Thickness(0, 0, 0, 14)
            };
            var optStack = new StackPanel();

            chkInstall = CreateLargeOption("Download and configure system packages", "Installs core application engine, dependencies, and compiles background workers.", true);
            chkShortcut = CreateLargeOption("Create Desktop & Start Menu application shortcuts", "Registers Universal File Toolkit into Windows Search and creates Desktop launcher.", true);
            chkClaude = CreateLargeOption("Configure Claude Desktop MCP Connector (Optional)", "Allows Claude Desktop app to directly access all 100+ file manipulation tools.", false);
            chkLaunch = CreateLargeOption("Launch Universal File Toolkit immediately after setup", "Frees ports 3000/3001 and opens in dedicated Chrome/Edge App Mode.", true);

            optStack.Children.Add(chkInstall);
            optStack.Children.Add(chkShortcut);
            optStack.Children.Add(chkClaude);
            optStack.Children.Add(chkLaunch);

            optCard.Child = optStack;
            Grid.SetRow(optCard, 2);
            mainGrid.Children.Add(optCard);

            // --- 3. Monospace Log Box ---
            var logBorder = new Border
            {
                Background = (Brush)new BrushConverter().ConvertFromString("#f8fafc"),
                BorderBrush = (Brush)new BrushConverter().ConvertFromString("#e2e8f0"),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(10),
                Margin = new Thickness(0, 0, 0, 12)
            };
            scrollLog = new ScrollViewer { VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
            txtLog = new TextBox
            {
                Background = Brushes.Transparent,
                Foreground = (Brush)new BrushConverter().ConvertFromString("#334155"),
                BorderThickness = new Thickness(0),
                FontFamily = new FontFamily("Consolas, Courier New, monospace"),
                FontSize = 11,
                IsReadOnly = true,
                TextWrapping = TextWrapping.Wrap,
                Text = "Ready. Click 'Start Setup' to install and launch Universal File Toolkit.\r\n"
            };
            scrollLog.Content = txtLog;
            logBorder.Child = scrollLog;
            Grid.SetRow(logBorder, 3);
            mainGrid.Children.Add(logBorder);

            // --- 4. Progress Bar & Status ---
            var progStack = new StackPanel { Margin = new Thickness(0, 0, 0, 14) };
            var progGrid = new Grid { Margin = new Thickness(0, 0, 0, 6) };
            lblStatus = new TextBlock
            {
                Text = "Ready",
                Foreground = (Brush)new BrushConverter().ConvertFromString("#475569"),
                FontSize = 12,
                FontWeight = FontWeights.Medium
            };
            lblPercent = new TextBlock
            {
                Text = "0%",
                Foreground = (Brush)new BrushConverter().ConvertFromString("#1d4ed8"),
                FontSize = 12,
                FontWeight = FontWeights.Bold,
                HorizontalAlignment = HorizontalAlignment.Right
            };
            progGrid.Children.Add(lblStatus);
            progGrid.Children.Add(lblPercent);

            progressBar = new ProgressBar
            {
                Height = 8,
                Minimum = 0,
                Maximum = 100,
                Value = 0,
                Background = (Brush)new BrushConverter().ConvertFromString("#e2e8f0"),
                Foreground = (Brush)new BrushConverter().ConvertFromString("#1d4ed8"),
                BorderThickness = new Thickness(0)
            };
            progStack.Children.Add(progGrid);
            progStack.Children.Add(progressBar);
            Grid.SetRow(progStack, 4);
            mainGrid.Children.Add(progStack);

            // --- 5. Action Buttons ---
            var btnGrid = new Grid();
            btnGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            btnGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            btnGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            btnInstall = new Button
            {
                Content = "Start Setup",
                Height = 40,
                Background = (Brush)new BrushConverter().ConvertFromString("#1d4ed8"),
                Foreground = Brushes.White,
                FontWeight = FontWeights.Bold,
                FontSize = 13,
                BorderThickness = new Thickness(0),
                Cursor = System.Windows.Input.Cursors.Hand,
                Margin = new Thickness(0, 0, 12, 0)
            };
            btnInstall.Click += BtnInstall_Click;

            btnLaunch = new Button
            {
                Content = "Launch App",
                Height = 40,
                Background = (Brush)new BrushConverter().ConvertFromString("#f1f5f9"),
                Foreground = (Brush)new BrushConverter().ConvertFromString("#1e293b"),
                FontWeight = FontWeights.SemiBold,
                FontSize = 13,
                BorderThickness = new Thickness(1),
                BorderBrush = (Brush)new BrushConverter().ConvertFromString("#cbd5e1"),
                Padding = new Thickness(18, 0, 18, 0),
                Cursor = System.Windows.Input.Cursors.Hand,
                Margin = new Thickness(0, 0, 12, 0)
            };
            btnLaunch.Click += (s, e) => LaunchApplication();

            btnClose = new Button
            {
                Content = "Close",
                Height = 40,
                Background = Brushes.White,
                Foreground = (Brush)new BrushConverter().ConvertFromString("#64748b"),
                FontSize = 13,
                BorderThickness = new Thickness(1),
                BorderBrush = (Brush)new BrushConverter().ConvertFromString("#e2e8f0"),
                Padding = new Thickness(20, 0, 20, 0),
                Cursor = System.Windows.Input.Cursors.Hand
            };
            btnClose.Click += (s, e) => Close();

            Grid.SetColumn(btnInstall, 0);
            Grid.SetColumn(btnLaunch, 1);
            Grid.SetColumn(btnClose, 2);

            btnGrid.Children.Add(btnInstall);
            btnGrid.Children.Add(btnLaunch);
            btnGrid.Children.Add(btnClose);

            Grid.SetRow(btnGrid, 5);
            mainGrid.Children.Add(btnGrid);

            mainBorder.Child = mainGrid;
            Content = mainBorder;
        }

        private CheckBox CreateLargeOption(string title, string description, bool isChecked)
        {
            var stack = new StackPanel { Margin = new Thickness(4, 0, 0, 0) };
            var titleBlock = new TextBlock
            {
                Text = title,
                FontWeight = FontWeights.SemiBold,
                Foreground = (Brush)new BrushConverter().ConvertFromString("#0f172a"),
                FontSize = 13
            };
            var descBlock = new TextBlock
            {
                Text = description,
                Foreground = (Brush)new BrushConverter().ConvertFromString("#64748b"),
                FontSize = 11,
                Margin = new Thickness(0, 2, 0, 0)
            };
            stack.Children.Add(titleBlock);
            stack.Children.Add(descBlock);

            var cb = new CheckBox
            {
                Content = stack,
                IsChecked = isChecked,
                Margin = new Thickness(0, 6, 0, 6),
                Cursor = System.Windows.Input.Cursors.Hand,
                VerticalContentAlignment = VerticalAlignment.Center
            };
            return cb;
        }

        private void CheckInitialEnvironment()
        {
            Task.Factory.StartNew(() =>
            {
                string nodeVer = GetNodeVersion();
                bool hasPackageJson = File.Exists(Path.Combine(rootDir, "package.json"));
                bool hasModules = Directory.Exists(Path.Combine(rootDir, "node_modules"));
                bool hasBuild = File.Exists(Path.Combine(rootDir, "packages", "backend", "dist", "index.js"));

                Dispatcher.Invoke(new Action(() =>
                {
                    if (!string.IsNullOrEmpty(nodeVer))
                    {
                        txtNodeStatus.Text = string.Format("Installed ({0})", nodeVer);
                        txtNodeStatus.Foreground = (Brush)new BrushConverter().ConvertFromString("#15803d");
                    }
                    else
                    {
                        txtNodeStatus.Text = "Not detected (Auto-install)";
                        txtNodeStatus.Foreground = (Brush)new BrushConverter().ConvertFromString("#b45309");
                    }

                    if (hasPackageJson && hasModules && hasBuild)
                    {
                        txtDepStatus.Text = "Installed & Built (Ready)";
                        txtDepStatus.Foreground = (Brush)new BrushConverter().ConvertFromString("#15803d");
                    }
                    else if (hasPackageJson && hasModules)
                    {
                        txtDepStatus.Text = "Packages Installed";
                        txtDepStatus.Foreground = (Brush)new BrushConverter().ConvertFromString("#1d4ed8");
                    }
                    else if (hasPackageJson)
                    {
                        txtDepStatus.Text = "Source Ready (Install needed)";
                        txtDepStatus.Foreground = (Brush)new BrushConverter().ConvertFromString("#1d4ed8");
                    }
                    else
                    {
                        txtDepStatus.Text = "Will auto-download repository";
                        txtDepStatus.Foreground = (Brush)new BrushConverter().ConvertFromString("#1d4ed8");
                    }
                }));
            });
        }

        private string GetNodeVersion()
        {
            var res = RunCommand("node -v", AppDomain.CurrentDomain.BaseDirectory);
            if (res.ExitCode == 0 && !string.IsNullOrEmpty(res.Output))
            {
                return res.Output.Trim();
            }
            string pfNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs");
            if (Directory.Exists(pfNode))
            {
                string path = Environment.GetEnvironmentVariable("PATH") ?? "";
                Environment.SetEnvironmentVariable("PATH", pfNode + ";" + path);
                var retry = RunCommand("node -v", AppDomain.CurrentDomain.BaseDirectory);
                if (retry.ExitCode == 0 && !string.IsNullOrEmpty(retry.Output))
                {
                    return retry.Output.Trim();
                }
            }
            return null;
        }

        private void AppendLog(string message)
        {
            Dispatcher.Invoke(new Action(() =>
            {
                string timestamp = DateTime.Now.ToString("HH:mm:ss");
                txtLog.AppendText(string.Format("[{0}] {1}\r\n", timestamp, message));
                scrollLog.ScrollToEnd();
            }));
        }

        private void SetProgress(int percent, string status)
        {
            Dispatcher.Invoke(new Action(() =>
            {
                progressBar.Value = percent;
                lblPercent.Text = string.Format("{0}%", percent);
                lblStatus.Text = status;
            }));
        }

        private void BtnInstall_Click(object sender, RoutedEventArgs e)
        {
            btnInstall.IsEnabled = false;
            chkInstall.IsEnabled = false;
            chkShortcut.IsEnabled = false;
            chkClaude.IsEnabled = false;
            chkLaunch.IsEnabled = false;

            bool doInstall = chkInstall.IsChecked == true;
            bool doShortcut = chkShortcut.IsChecked == true;
            bool doClaude = chkClaude.IsChecked == true;
            bool doLaunch = chkLaunch.IsChecked == true;

            Task.Factory.StartNew(() => PerformInstallation(doInstall, doShortcut, doClaude, doLaunch));
        }

        private void PerformInstallation(bool doInstall, bool doShortcut, bool doClaude, bool doLaunch)
        {
            try
            {
                SetProgress(5, "Verifying Node.js environment...");
                AppendLog("Beginning Universal File Toolkit installation...");

                // 1. Verify Node.js
                string nodeVer = GetNodeVersion();
                if (string.IsNullOrEmpty(nodeVer))
                {
                    AppendLog("Node.js was not detected. Installing automatically via winget...");
                    RunCommand("winget install OpenJS.NodeJS.LTS -h --accept-source-agreements --accept-package-agreements", AppDomain.CurrentDomain.BaseDirectory);
                    nodeVer = GetNodeVersion();
                    if (string.IsNullOrEmpty(nodeVer))
                    {
                        AppendLog("Node.js LTS is required. Opening official download page...");
                        Process.Start("https://nodejs.org/en/download");
                        throw new Exception("Node.js installation pending. Please complete installer and retry.");
                    }
                    AppendLog(string.Format("Node.js installed successfully: {0}", nodeVer));
                }
                else
                {
                    AppendLog(string.Format("Node.js verified: {0}", nodeVer));
                }

                // 2. Download source repository if running outside repo
                if (isStandaloneInstaller || !File.Exists(Path.Combine(rootDir, "package.json")))
                {
                    SetProgress(15, "Downloading Universal File Toolkit core system...");
                    AppendLog(string.Format("Target installation directory: {0}", targetInstallDir));
                    if (!Directory.Exists(targetInstallDir))
                    {
                        Directory.CreateDirectory(targetInstallDir);
                    }

                    string tempZip = Path.Combine(Path.GetTempPath(), "uft-source.zip");
                    string tempExtract = Path.Combine(Path.GetTempPath(), "uft-extract-" + Guid.NewGuid().ToString("N"));

                    AppendLog("Downloading latest release archive from GitHub...");
                    using (var wc = new WebClient())
                    {
                        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;
                        wc.Headers.Add("User-Agent", "UniversalFileToolkit-Installer");
                        wc.DownloadFile("https://github.com/Irfanpathan21/Universal-File-Claude-Connector/archive/refs/heads/last.zip", tempZip);
                    }

                    SetProgress(25, "Extracting system files...");
                    AppendLog("Extracting repository files...");
                    RunCommand(string.Format("powershell -Command \"Expand-Archive -Path '{0}' -DestinationPath '{1}' -Force\"", tempZip, tempExtract), targetInstallDir);

                    // Move contents of extracted directory (e.g. Universal-File-Claude-Connector-last) into targetInstallDir
                    string[] subDirs = Directory.GetDirectories(tempExtract);
                    string sourceDir = subDirs.Length > 0 ? subDirs[0] : tempExtract;

                    CopyDirectory(sourceDir, targetInstallDir);

                    // Clean up temp
                    try
                    {
                        File.Delete(tempZip);
                        Directory.Delete(tempExtract, true);
                    }
                    catch { }

                    rootDir = targetInstallDir;
                    Dispatcher.Invoke(new Action(() => { txtPath.Text = rootDir; }));
                    AppendLog("Repository downloaded and extracted successfully.");
                }

                // Ensure executables are present in rootDir
                string currentExe = Process.GetCurrentProcess().MainModule.FileName;
                string destSetup = Path.Combine(rootDir, "Setup.exe");
                if (File.Exists(currentExe) && !string.Equals(currentExe, destSetup, StringComparison.OrdinalIgnoreCase))
                {
                    try { File.Copy(currentExe, destSetup, true); } catch { }
                }

                // Copy UniversalFileToolkit.exe if next to current exe
                string currentLauncher = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "UniversalFileToolkit.exe");
                string destLauncher = Path.Combine(rootDir, "UniversalFileToolkit.exe");
                if (File.Exists(currentLauncher) && !File.Exists(destLauncher))
                {
                    try { File.Copy(currentLauncher, destLauncher, true); } catch { }
                }

                // Determine package manager
                string pkgMgr = "pnpm";
                var pnpmCheck = RunCommand("pnpm -v", rootDir);
                if (pnpmCheck.ExitCode != 0)
                {
                    pkgMgr = "npx -y pnpm@9";
                }
                AppendLog(string.Format("Using package manager: {0}", pkgMgr));

                // 3. Dependencies & Build
                if (doInstall)
                {
                    bool hasModules = Directory.Exists(Path.Combine(rootDir, "node_modules"));
                    if (!hasModules)
                    {
                        SetProgress(40, "Installing dependencies...");
                        AppendLog(string.Format("Running '{0} install'...", pkgMgr));
                        var installRes = RunCommand(string.Format("{0} install", pkgMgr), rootDir);
                        if (installRes.ExitCode != 0)
                        {
                            AppendLog("Retrying with --no-frozen-lockfile...");
                            installRes = RunCommand(string.Format("{0} install --no-frozen-lockfile", pkgMgr), rootDir);
                        }
                        AppendLog("Dependencies installed successfully.");
                    }
                    else
                    {
                        AppendLog("Dependencies are already installed.");
                    }

                    SetProgress(65, "Verifying backend and engine build...");
                    bool hasBackendBuild = File.Exists(Path.Combine(rootDir, "packages", "backend", "dist", "index.js"));
                    if (!hasBackendBuild)
                    {
                        AppendLog(string.Format("Executing '{0} build'...", pkgMgr));
                        var buildRes = RunCommand(string.Format("{0} build", pkgMgr), rootDir);
                        if (buildRes.ExitCode == 0)
                        {
                            AppendLog("Build completed successfully.");
                        }
                    }
                    else
                    {
                        AppendLog("Backend and engine build verified.");
                    }
                }

                // 4. Claude Desktop MCP Config (Optional)
                if (doClaude)
                {
                    SetProgress(80, "Configuring Claude Desktop MCP connector...");
                    ConfigureClaudeDesktop();
                }
                else
                {
                    AppendLog("Claude Desktop connector skipped (Optional).");
                }

                // 5. Desktop and Start Menu Shortcuts (Searchable in Windows)
                if (doShortcut)
                {
                    SetProgress(90, "Registering Windows Start Menu and Desktop shortcuts...");
                    CreateAppShortcuts();
                }

                SetProgress(100, "Setup complete.");
                AppendLog("Installation finished successfully.");
                AppendLog("Universal File Toolkit is ready to use.");

                Dispatcher.Invoke(new Action(() =>
                {
                    btnInstall.Content = "Installed Successfully";
                    btnInstall.Background = (Brush)new BrushConverter().ConvertFromString("#15803d");
                    btnLaunch.Background = (Brush)new BrushConverter().ConvertFromString("#1d4ed8");
                    btnLaunch.Foreground = Brushes.White;
                }));

                if (doLaunch)
                {
                    LaunchApplication();
                }
            }
            catch (Exception ex)
            {
                AppendLog(string.Format("Error: {0}", ex.Message));
                SetProgress(0, "Setup encountered an issue.");
                Dispatcher.Invoke(new Action(() =>
                {
                    btnInstall.IsEnabled = true;
                    btnInstall.Content = "Retry Setup";
                }));
            }
        }

        private static void CopyDirectory(string sourceDir, string destinationDir)
        {
            var dir = new DirectoryInfo(sourceDir);
            if (!dir.Exists) return;

            DirectoryInfo[] dirs = dir.GetDirectories();
            Directory.CreateDirectory(destinationDir);

            foreach (FileInfo file in dir.GetFiles())
            {
                string targetFilePath = Path.Combine(destinationDir, file.Name);
                file.CopyTo(targetFilePath, true);
            }

            foreach (DirectoryInfo subDir in dirs)
            {
                string newDestinationDir = Path.Combine(destinationDir, subDir.Name);
                CopyDirectory(subDir.FullName, newDestinationDir);
            }
        }

        private void ConfigureClaudeDesktop()
        {
            try
            {
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string claudeDir = Path.Combine(appData, "Claude");
                if (!Directory.Exists(claudeDir))
                {
                    Directory.CreateDirectory(claudeDir);
                }
                string configPath = Path.Combine(claudeDir, "claude_desktop_config.json");
                string mcpDist = Path.Combine(rootDir, "packages", "mcp-server", "dist", "index.js").Replace("\\", "/");

                string snippet = "{\n  \"mcpServers\": {\n    \"universal-file-toolkit\": {\n      \"command\": \"node\",\n      \"args\": [\"" + mcpDist + "\"],\n      \"env\": {\n        \"SELECTED_SUITE\": \"1\"\n      }\n    }\n  }\n}";

                File.WriteAllText(configPath, snippet, Encoding.UTF8);
                AppendLog(string.Format("Claude Desktop MCP configuration registered at: {0}", configPath));
            }
            catch (Exception ex)
            {
                AppendLog(string.Format("Notice configuring Claude: {0}", ex.Message));
            }
        }

        private void CreateAppShortcuts()
        {
            try
            {
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string desktopShortcut = Path.Combine(desktopPath, "Universal File Toolkit.lnk");

                string startMenuPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"Microsoft\Windows\Start Menu\Programs");
                string startMenuShortcut = Path.Combine(startMenuPath, "Universal File Toolkit.lnk");

                string launcherExe = Path.Combine(rootDir, "UniversalFileToolkit.exe");
                string iconPath = Path.Combine(rootDir, "assets", "app-icon.ico");

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    object shell = Activator.CreateInstance(shellType);

                    // 1. Desktop Shortcut
                    object scDesktop = shellType.InvokeMember("CreateShortcut", System.Reflection.BindingFlags.InvokeMethod, null, shell, new object[] { desktopShortcut });
                    Type scType1 = scDesktop.GetType();
                    scType1.InvokeMember("TargetPath", System.Reflection.BindingFlags.SetProperty, null, scDesktop, new object[] { launcherExe });
                    scType1.InvokeMember("WorkingDirectory", System.Reflection.BindingFlags.SetProperty, null, scDesktop, new object[] { rootDir });
                    scType1.InvokeMember("Description", System.Reflection.BindingFlags.SetProperty, null, scDesktop, new object[] { "Universal File Toolkit" });
                    if (File.Exists(iconPath))
                    {
                        scType1.InvokeMember("IconLocation", System.Reflection.BindingFlags.SetProperty, null, scDesktop, new object[] { iconPath + ",0" });
                    }
                    scType1.InvokeMember("Save", System.Reflection.BindingFlags.InvokeMethod, null, scDesktop, null);

                    // 2. Start Menu Shortcut (Makes app searchable in Windows Search)
                    object scStart = shellType.InvokeMember("CreateShortcut", System.Reflection.BindingFlags.InvokeMethod, null, shell, new object[] { startMenuShortcut });
                    Type scType2 = scStart.GetType();
                    scType2.InvokeMember("TargetPath", System.Reflection.BindingFlags.SetProperty, null, scStart, new object[] { launcherExe });
                    scType2.InvokeMember("WorkingDirectory", System.Reflection.BindingFlags.SetProperty, null, scStart, new object[] { rootDir });
                    scType2.InvokeMember("Description", System.Reflection.BindingFlags.SetProperty, null, scStart, new object[] { "Universal File Toolkit" });
                    if (File.Exists(iconPath))
                    {
                        scType2.InvokeMember("IconLocation", System.Reflection.BindingFlags.SetProperty, null, scStart, new object[] { iconPath + ",0" });
                    }
                    scType2.InvokeMember("Save", System.Reflection.BindingFlags.InvokeMethod, null, scStart, null);

                    AppendLog(string.Format("Created Desktop Shortcut: {0}", desktopShortcut));
                    AppendLog(string.Format("Registered in Windows Start Menu: {0}", startMenuShortcut));
                }
            }
            catch (Exception ex)
            {
                AppendLog(string.Format("Notice creating shortcuts: {0}", ex.Message));
            }
        }

        private void LaunchApplication()
        {
            try
            {
                AppendLog("Launching Universal File Toolkit in foreground...");
                string launcherExe = Path.Combine(rootDir, "UniversalFileToolkit.exe");
                if (File.Exists(launcherExe))
                {
                    var p = new Process();
                    p.StartInfo.FileName = launcherExe;
                    p.StartInfo.WorkingDirectory = rootDir;
                    p.StartInfo.UseShellExecute = true;
                    p.Start();
                }
                else
                {
                    // Direct node fallback if launcher is missing
                    string startScript = Path.Combine(rootDir, "scripts", "start-services.js");
                    if (File.Exists(startScript))
                    {
                        var p = new Process();
                        p.StartInfo.FileName = "node";
                        p.StartInfo.Arguments = string.Format("\"{0}\"", startScript);
                        p.StartInfo.WorkingDirectory = rootDir;
                        p.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
                        p.StartInfo.CreateNoWindow = true;
                        p.Start();

                        Process.Start("http://localhost:3000");
                    }
                    else
                    {
                        AppendLog("Application executable not found. Please click 'Start Setup' first.");
                        return;
                    }
                }

                AppendLog("Universal File Toolkit launched successfully. Closing setup wizard...");
                Task.Factory.StartNew(() =>
                {
                    Thread.Sleep(1200);
                    Dispatcher.Invoke(new Action(() =>
                    {
                        try
                        {
                            this.Close();
                            Application.Current.Shutdown();
                        }
                        catch { }
                    }));
                });
            }
            catch (Exception ex)
            {
                AppendLog(string.Format("Error launching application: {0}", ex.Message));
            }
        }

        private CommandResult RunCommand(string command, string workingDir)
        {
            try
            {
                var psi = new ProcessStartInfo("cmd.exe", "/c " + command)
                {
                    WorkingDirectory = workingDir,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using (var process = Process.Start(psi))
                {
                    string output = process.StandardOutput.ReadToEnd();
                    string error = process.StandardError.ReadToEnd();
                    process.WaitForExit();
                    return new CommandResult(process.ExitCode, output + "\n" + error);
                }
            }
            catch (Exception ex)
            {
                return new CommandResult(-1, ex.Message);
            }
        }
    }
}
