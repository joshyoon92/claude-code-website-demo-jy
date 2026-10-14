# Resize a JPEG (or PNG) to at most -MaxWidth pixels wide, saved as JPEG.
# Usage:
#   powershell -NoProfile -File resize-image.ps1 -Source "in.jpg" -Dest "out.jpg" [-MaxWidth 1600] [-Quality 85]
# Uses Windows' built-in System.Drawing, so nothing needs installing.
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Dest,
  [int]$MaxWidth = 1600,
  [long]$Quality = 85
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Image]::FromFile((Resolve-Path $Source).Path)
try {
  $w = [Math]::Min($MaxWidth, $src.Width)
  $h = [int][Math]::Round($src.Height * $w / $src.Width)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.DrawImage($src, 0, 0, $w, $h)

  $jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), $Quality
  $destPath = [System.IO.Path]::GetFullPath($Dest)
  $bmp.Save($destPath, $jpeg, $params)
  $g.Dispose(); $bmp.Dispose()
}
finally {
  $src.Dispose()
}
"{0}: {1} x {2}, {3:N0} KB" -f $Dest, $w, $h, ((Get-Item $destPath).Length / 1KB)
