$currentBuildNumber = [int] (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").CurrentBuildNumber
$windows11Version22H2BuildNumber = 22621
$currentUpdateBuildRevision = [int] (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").UBR

Write-Host $currentBuildNumber
Write-Host $currentUpdateBuildRevision

# only OS build in range 22621.xxx ~ 22632.1344
$doesPerUserFontInstallationHaveIssue = ($currentBuildNumber -ge $windows11Version22H2BuildNumber) -and ($currentUpdateBuildRevision -lt 1344)

Write-Host $doesPerUserFontInstallationHaveIssue
Write-Host ($currentUpdateBuildRevision -lt 1344)

