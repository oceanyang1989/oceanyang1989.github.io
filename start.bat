@echo off
cd /d "%~dp0"
start http://localhost:8080
powershell -Command "$l=New-Object System.Net.HttpListener;$l.Prefixes.Add('http://localhost:8080/');$l.Start();Write-Host 'Game server running at http://localhost:8080';while($l.IsListening){$c=$l.GetContext();$r=$c.Response;$f=$c.Request.Url.LocalPath;if($f -eq '/'){$f='/index.html'};$p=Join-Path (Get-Location) $f.Substring(1);if(Test-Path $p){$b=[IO.File]::ReadAllBytes($p);$r.ContentLength64=$b.Length;$r.OutputStream.Write($b,0,$b.Length)}else{$r.StatusCode=404}$r.Close()}"
