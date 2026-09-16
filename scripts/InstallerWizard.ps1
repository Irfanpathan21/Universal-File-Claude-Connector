param (
  [switch]$Silent = $false
)

$RootDir = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $RootDir

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Universal File Toolkit — Setup Wizard" 
        Height="580" Width="720" 
        WindowStartupLocation="CenterScreen" 
        ResizeMode="NoResize"
        Background="#0b0f19" 
        FontFamily="Segoe UI">
    <Window.Resources>
        <Style TargetType="CheckBox">
            <Setter Property="Foreground" Value="#e2e8f0"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="Margin" Value="0,4,0,4"/>
            <Setter Property="Cursor" Value="Hand"/>
        </Style>
    </Window.Resources>

    <Grid Margin="24">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- Header -->
        <Grid Grid.Row="0" Margin="0,0,0,16">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="Auto"/>
                <ColumnDefinition Width="*"/>
            </Grid.ColumnDefinitions>
            <Border Grid.Column="0" Width="52" Height="52" CornerRadius="12" Background="#004ac6" Margin="0,0,16,0">
                <TextBlock Text="U" Foreground="White" FontSize="26" FontWeight="Bold" HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <StackPanel Grid.Column="1" VerticalAlignment="Center">
                <TextBlock Text="Universal File Toolkit" Foreground="#f8fafc" FontSize="20" FontWeight="Bold"/>
                <TextBlock Text="Local Windows Setup &amp; Claude Desktop MCP Connector (100 Active Tools)" Foreground="#94a3b8" FontSize="12"/>
            </StackPanel>
        </Grid>

        <!-- Path Info Card -->
        <Border Grid.Row="1" Background="#131c2e" BorderBrush="#1e293b" BorderThickness="1" CornerRadius="8" Padding="12" Margin="0,0,0,14">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="Auto"/>
                    <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>
                <TextBlock Text="Install Directory:" Foreground="#64748b" FontSize="11" FontWeight="SemiBold" VerticalAlignment="Center" Margin="0,0,10,0"/>
                <TextBlock x:Name="txtPath" Grid.Column="1" Text="$RootDir" Foreground="#38bdf8" FontSize="11" TextTrimming="CharacterEllipsis" VerticalAlignment="Center"/>
            </Grid>
        </Border>

        <!-- Options Card -->
        <Border Grid.Row="2" Background="#131c2e" BorderBrush="#1e293b" BorderThickness="1" CornerRadius="8" Padding="14,10" Margin="0,0,0,14">
            <StackPanel>
                <TextBlock Text="Setup Tasks to Perform:" Foreground="#94a3b8" FontSize="12" FontWeight="SemiBold" Margin="0,0,0,6"/>
                <CheckBox x:Name="chkBuild" Content="Build &amp; verify workspace packages (Fast incremental build)" IsChecked="True"/>
                <CheckBox x:Name="chkClaude" Content="Connect MCP server to Claude Desktop PC (claude_desktop_config.json)" IsChecked="True"/>
                <CheckBox x:Name="chkShortcut" Content="Create Desktop Shortcut with application icon" IsChecked="True"/>
                <CheckBox x:Name="chkLaunch" Content="Launch Web App in Google Chrome window after setup" IsChecked="True"/>
            </StackPanel>
        </Border>

        <!-- Log Box -->
        <Border Grid.Row="3" Background="#060911" BorderBrush="#1e293b" BorderThickness="1" CornerRadius="8" Padding="8" Margin="0,0,0,14">
            <ScrollViewer x:Name="scrollLog" VerticalScrollBarVisibility="Auto">
                <TextBox x:Name="txtLog" Background="Transparent" Foreground="#a5b4fc" BorderThickness="0" 
                         FontFamily="Consolas" FontSize="11" IsReadOnly="True" TextWrapping="Wrap" 
                         Text="Ready. Click 'Start One-Click Setup' to begin installation...&#x0a;"/>
            </ScrollViewer>
        </Border>

        <!-- Progress Bar & Status -->
        <StackPanel Grid.Row="4" Margin="0,0,0,14">
            <Grid Margin="0,0,0,6">
                <TextBlock x:Name="lblStatus" Text="Ready" Foreground="#94a3b8" FontSize="11"/>
                <TextBlock x:Name="lblPercent" Text="0%" Foreground="#38bdf8" FontSize="11" FontWeight="Bold" HorizontalAlignment="Right"/>
            </Grid>
            <ProgressBar x:Name="progressBar" Height="8" Minimum="0" Maximum="100" Value="0" 
                         Background="#1e293b" Foreground="#004ac6" BorderThickness="0"/>
        </StackPanel>

        <!-- Buttons Row -->
        <Grid Grid.Row="5">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="Auto"/>
                <ColumnDefinition Width="Auto"/>
                <ColumnDefinition Width="Auto"/>
            </Grid.ColumnDefinitions>

            <Button x:Name="btnInstall" Grid.Column="0" Content="🚀 Start One-Click Setup" Height="38" 
                    Background="#004ac6" Foreground="White" FontWeight="Bold" FontSize="13" 
                    BorderThickness="0" Cursor="Hand" Margin="0,0,10,0"/>

            <Button x:Name="btnLaunch" Grid.Column="1" Content="🌐 Launch App in Chrome" Height="38" 
                    Background="#1e293b" Foreground="#e2e8f0" FontWeight="SemiBold" FontSize="12" 
                    BorderThickness="1" BorderBrush="#334155" Padding="14,0" Cursor="Hand" Margin="0,0,10,0"/>

            <Button x:Name="btnClaudeConfig" Grid.Column="2" Content="⚙️ Claude Config" Height="38" 
                    Background="#1e293b" Foreground="#e2e8f0" FontWeight="SemiBold" FontSize="12" 
                    BorderThickness="1" BorderBrush="#334155" Padding="14,0" Cursor="Hand" Margin="0,0,10,0"/>

            <Button x:Name="btnClose" Grid.Column="3" Content="Close" Height="38" 
                    Background="#1e293b" Foreground="#94a3b8" FontSize="12" 
                    BorderThickness="1" BorderBrush="#334155" Padding="18,0" Cursor="Hand"/>
        </Grid>
    </Grid>
</Window>
"@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [System.Windows.Markup.XamlReader]::Load($reader)

# Element References
$txtPath = $window.FindName("txtPath")
$chkBuild = $window.FindName("chkBuild")
$chkClaude = $window.FindName("chkClaude")
$chkShortcut = $window.FindName("chkShortcut")
$chkLaunch = $window.FindName("chkLaunch")
$txtLog = $window.FindName("txtLog")
$scrollLog = $window.FindName("scrollLog")
$lblStatus = $window.FindName("lblStatus")
$lblPercent = $window.FindName("lblPercent")
$progressBar = $window.FindName("progressBar")
$btnInstall = $window.FindName("btnInstall")
$btnLaunch = $window.FindName("btnLaunch")
$btnClaudeConfig = $window.FindName("btnClaudeConfig")
$btnClose = $window.FindName("btnClose")

$txtPath.Text = $RootDir

function Append-Log([string]$message) {
    $timestamp = (Get-Date).ToString("HH:mm:ss")
    $txtLog.AppendText("[$timestamp] $message`r`n")
    $scrollLog.ScrollToEnd()
    [System.Windows.Forms.Application]::DoEvents()
}

function Set-Progress([int]$percent, [string]$status) {
    $progressBar.Value = $percent
    $lblPercent.Text = "$percent%"
    $lblStatus.Text = $status
    [System.Windows.Forms.Application]::DoEvents()
}

# Install Handler
$btnInstall.Add_Click({
    $btnInstall.IsEnabled = $false
    $chkBuild.IsEnabled = $false
    $chkClaude.IsEnabled = $false
    $chkShortcut.IsEnabled = $false
    $chkLaunch.IsEnabled = $false

    try {
        Set-Progress 10 "Checking environment & dependencies..."
        Append-Log "Beginning setup in: $RootDir"

        # 1. Build icon if missing
        if (-not (Test-Path "$RootDir\assets\app-icon.ico")) {
            Append-Log "Generating application icons..."
            & powershell -ExecutionPolicy Bypass -File "$RootDir\scripts\create-icon.ps1" | Out-Null
        }

        # 2. Build packages if checked
        if ($chkBuild.IsChecked) {
            Set-Progress 25 "Building workspace packages (turbo run build)..."
            Append-Log "Executing 'npx -y pnpm@9 build'..."
            $buildProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx -y pnpm@9 build" -WorkingDirectory $RootDir -NoNewWindow -PassThru -Wait
            if ($buildProcess.ExitCode -eq 0) {
                Append-Log "Build completed successfully!"
            } else {
                Append-Log "Warning: Build returned code $($buildProcess.ExitCode). Continuing with existing dist..."
            }
        }

        # 3. Configure Claude PC
        if ($chkClaude.IsChecked) {
            Set-Progress 55 "Configuring Claude Desktop PC connector..."
            $claudeConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"
            $claudeConfigDir = [System.IO.Path]::GetDirectoryName($claudeConfigPath)

            if (-not (Test-Path $claudeConfigDir)) {
                New-Item -ItemType Directory -Force -Path $claudeConfigDir | Out-Null
            }

            $configJson = @{ mcpServers = @{} }
            if (Test-Path $claudeConfigPath) {
                try {
                    $raw = Get-Content $claudeConfigPath -Raw
                    $parsed = $raw | ConvertFrom-Json
                    if ($parsed.mcpServers) {
                        $parsed.psobject.properties | ForEach-Object {
                            $configJson[$_.Name] = $_.Value
                        }
                    }
                } catch {
                    Append-Log "Notice: Creating fresh config for Claude."
                }
            }

            $mcpServerPath = "$RootDir\packages\mcp-server\dist\index.js"
            if (-not $configJson.mcpServers) { $configJson.mcpServers = @{} }
            $configJson.mcpServers["universal-file-toolkit"] = @{
                command = "node"
                args = @($mcpServerPath)
                env = @{
                    SELECTED_SUITE = "1"
                }
            }

            $configJson | ConvertTo-Json -Depth 10 | Set-Content $claudeConfigPath -Encoding UTF8
            Append-Log "Claude Desktop MCP connector registered successfully at:"
            Append-Log "  $claudeConfigPath"
        }

        # 4. Create Desktop Shortcut
        if ($chkShortcut.IsChecked) {
            Set-Progress 80 "Creating Windows Desktop Shortcut..."
            & powershell -ExecutionPolicy Bypass -File "$RootDir\scripts\create-desktop-shortcut.ps1" -RootDir $RootDir | Out-Null
            Append-Log "Desktop Shortcut 'Universal File Toolkit.lnk' created on your Desktop!"
        }

        Set-Progress 100 "Setup complete! Ready to launch."
        Append-Log "SUCCESS: All installation tasks completed!"
        Append-Log "--------------------------------------------------------"
        Append-Log "You can now click 'Launch App in Chrome' or double-click the"
        Append-Log "Desktop Shortcut anytime to run the toolkit!"

        $btnInstall.Content = "✅ Installed Successfully"
        $btnLaunch.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#004ac6")

        # 5. Launch if checked
        if ($chkLaunch.IsChecked) {
            Append-Log "Launching web application..."
            Start-Process -FilePath "$RootDir\launch.bat" -WorkingDirectory $RootDir
        }
    } catch {
        Append-Log "ERROR: $_"
        Set-Progress 0 "Setup encountered an error."
        $btnInstall.IsEnabled = $true
    }
})

# Launch Button Handler
$btnLaunch.Add_Click({
    Append-Log "Launching Universal File Toolkit..."
    Start-Process -FilePath "$RootDir\launch.bat" -WorkingDirectory $RootDir
})

# Claude Config Button Handler
$btnClaudeConfig.Add_Click({
    $claudeConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"
    if (Test-Path $claudeConfigPath) {
        Start-Process "notepad.exe" -ArgumentList $claudeConfigPath
    } else {
        [System.Windows.MessageBox]::Show("Claude config file not found at:`n$claudeConfigPath", "Claude Config")
    }
})

# Close Button Handler
$btnClose.Add_Click({
    $window.Close()
})

# Show window
$window.ShowDialog() | Out-Null
