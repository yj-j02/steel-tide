# Steel Tide — Typecast 무전 음성 생성 (PowerShell, 설치 필요 없음)
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $here "steeltide_radio_ko"; $log = Join-Path $here "log.txt"
function Log($m) { Write-Host $m; Add-Content -Path $log -Value $m -Encoding UTF8 }
Set-Content -Path $log -Value "start $(Get-Date)" -Encoding UTF8
$UA = "typecast-direct/1 powershell typecast-integration/1 (source=api-page; generated_by=claude)"
$API = "https://api.typecast.ai"
$key = ""
try { $key = (Get-Clipboard -Raw) } catch {}
if (-not $key -or $key.Trim().Length -lt 16 -or $key.Trim().Contains(" ")) {
  Write-Host "클립보드에서 키를 찾지 못했습니다. Typecast 키를 복사(Ctrl+C)한 뒤 이 창에서 Ctrl+V 하고 Enter:"
  $key = Read-Host "키"
} else { Log "클립보드에서 키를 읽었습니다 (클립보드는 비웁니다)"; try { Set-Clipboard -Value " " } catch {} }
$key = ($key -replace '[\x00-\x20\x7F]', '').Trim([char]0xFEFF, [char]0x200B)
Log "키 길이 $($key.Length)자 (앞뒤 공백·줄바꿈 제거)"
if (-not $key) { Log "키가 비어 있습니다."; exit 1 }
$H = @{ "X-API-KEY" = $key }
try {
  $vs = Invoke-RestMethod -Uri "$API/v3/voices?model=ssfm-v31" -Headers $H -UserAgent $UA
  if ($vs.voices) { $vs = $vs.voices }
  Log "음성 목록 $(@($vs).Count)개 받음"
  $hit = @($vs | Where-Object { "$($_.voice_name)$($_.name)" -like "*건석*" })
  foreach ($v in $hit) { Log "찾음: $($v.voice_id) | $($v.voice_name)$($v.name)" }
  if ($hit.Count -lt 1) {
    Log "'건석' 음성을 찾지 못했습니다. 아래는 목록 일부:"
    @($vs) | Select-Object -First 40 | ForEach-Object { Log "$($_.voice_id) | $($_.voice_name)$($_.name)" }
    $vid = Read-Host "사용할 voice_id (tc_...) 를 입력"
  } else { $vid = $hit[0].voice_id }
} catch { Log "음성 목록 오류: $($_.Exception.Message)"; exit 1 }
New-Item -ItemType Directory -Force -Path $out | Out-Null
$LINES = @(
  @("battle", "전투 배치 완료!", "toneup"),
  @("sunk", "적함 격침 확인!", "happy"),
  @("torp_warn", "어뢰 접근 중입니다! 회피 기동!", "angry"),
  @("ally_sunk", "아군 함정 침몰했습니다!", "sad"),
  @("launch", "전투기 출격합니다!", "toneup"),
  @("return", "전투기 귀환했습니다.", "normal"),
  @("fire", "함내 화재 발생!", "angry"),
  @("flood", "침수 발생! 손상통제반 투입!", "angry"),
  @("hull", "선체 손상 심각합니다!", "sad"),
  @("torp_launch", "어뢰 발사 완료!", "normal"),
  @("fleet", "적 함대 전멸했습니다!", "happy"),
  @("abandon", "총원 퇴함!", "sad"),
  @("promo", "진급을 축하드립니다!", "happy")
)
$done = @()
foreach ($l in $LINES) {
  $body = @{ model = "ssfm-v31"; voice_id = $vid; text = $l[1]; language = "kor";
    prompt = @{ emotion_type = "preset"; emotion_preset = $l[2]; emotion_intensity = 1.2 };
    output = @{ audio_format = "mp3"; audio_tempo = 1.08; target_lufs = -16 } } | ConvertTo-Json -Depth 5
  try {
    Invoke-WebRequest -Uri "$API/v1/text-to-speech" -Method Post -Headers $H -UserAgent $UA -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($body)) -OutFile (Join-Path $out "$($l[0]).mp3") -UseBasicParsing
    Log "ok  $($l[0]).mp3  $($l[1])"; $done += $l[0]
  } catch {
    $msg = $_.Exception.Message; try { $r = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream()); $msg += " " + $r.ReadToEnd() } catch {}
    Log "실패 $($l[0]): $msg"; if ($msg -match "401|402|403") { break }
  }
  Start-Sleep -Milliseconds 400
}
$key = $null
Set-Content -Path (Join-Path $out "index.json") -Value ("[" + (($done | ForEach-Object { '"' + $_ + '"' }) -join ",") + "]") -Encoding ASCII
Log "완료: $($done.Count)/13개 -> $out"
