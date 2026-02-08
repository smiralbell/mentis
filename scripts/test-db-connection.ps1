# Prueba si tu PC puede alcanzar el servidor de base de datos.
# Ejecutar en PowerShell: .\scripts\test-db-connection.ps1

$host = "panel.agenciabuffalo.es"
$port = 5434

Write-Host "Comprobando conexion a ${host}:${port}..." -ForegroundColor Cyan
Write-Host ""

# 1) Resolver DNS
Write-Host "1. Resolucion DNS (ping)..."
try {
    $ping = Test-Connection -ComputerName $host -Count 1 -ErrorAction Stop
    Write-Host "   OK - IP: $($ping.Address)" -ForegroundColor Green
} catch {
    Write-Host "   FALLO - No se pudo resolver o alcanzar el host: $_" -ForegroundColor Red
}

# 2) Puerto abierto (TCP)
Write-Host ""
Write-Host "2. Puerto $port (TCP)..."
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.ConnectAsync($host, $port).Wait(5000) | Out-Null
    if ($tcp.Connected) {
        Write-Host "   OK - El puerto esta abierto y acepta conexiones" -ForegroundColor Green
        $tcp.Close()
    } else {
        Write-Host "   FALLO - No se pudo conectar al puerto (timeout o rechazado)" -ForegroundColor Red
    }
} catch {
    Write-Host "   FALLO - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   (Firewall, servidor apagado o solo permite IPs concretas)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Si ambos fallan: revisa red, VPN o que el servidor este encendido." -ForegroundColor Gray
Write-Host "Si 1 OK y 2 FALLO: el servidor no acepta conexiones en 5434 o tu IP no esta permitida." -ForegroundColor Gray
