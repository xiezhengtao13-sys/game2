param (
    [Parameter(Mandatory=$true)][string]$InputPath,
    [Parameter(Mandatory=$true)][string]$OutputPath,
    [Parameter(Mandatory=$true)][int]$Width,
    [Parameter(Mandatory=$true)][int]$Height,
    [string]$TransparentColor = "",
    [switch]$TightCrop
)

Add-Type -AssemblyName System.Drawing

$srcBmp = [System.Drawing.Bitmap]::FromFile($InputPath)

if ($TransparentColor -eq "White") {
    $srcBmp.MakeTransparent([System.Drawing.Color]::White)
}

$dest = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($dest)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

if ($TightCrop) {
    # Find bounding box of non-transparent pixels
    $minX = $srcBmp.Width; $maxX = 0
    $minY = $srcBmp.Height; $maxY = 0

    # Sample to find bounding box
    for ($y = 0; $y -lt $srcBmp.Height; $y++) {
        for ($x = 0; $x -lt $srcBmp.Width; $x++) {
            $c = $srcBmp.GetPixel($x, $y)
            if ($c.A -gt 10 -and -not ($c.R -gt 245 -and $c.G -gt 245 -and $c.B -gt 245)) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    if ($maxX -gt $minX -and $maxY -gt $minY) {
        $bbW = $maxX - $minX + 1
        $bbH = $maxY - $minY + 1
        $srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $bbW, $bbH)

        # Scale to fit $Width x ($Height - 2), keeping aspect ratio
        $targetH = $Height - 2
        $scale = [Math]::Min($Width / $bbW, $targetH / $bbH)
        $drawW = [int]($bbW * $scale)
        $drawH = [int]($bbH * $scale)
        $drawX = [int](($Width - $drawW) / 2)
        $drawY = $Height - $drawH  # Bottom anchor

        $destRect = New-Object System.Drawing.Rectangle($drawX, $drawY, $drawW, $drawH)
        $g.DrawImage($srcBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    } else {
        $g.DrawImage($srcBmp, 0, 0, $Width, $Height)
    }
} else {
    $g.DrawImage($srcBmp, 0, 0, $Width, $Height)
}

$g.Dispose()
$srcBmp.Dispose()

$parent = [System.IO.Path]::GetDirectoryName($OutputPath)
if (-not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

$dest.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$dest.Dispose()

Write-Output "Resized and saved -> $OutputPath ($Width x $Height)"
