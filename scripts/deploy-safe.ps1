param(
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

function Fail($msg) {
  Write-Host "`n[ERRO] $msg" -ForegroundColor Red
  exit 1
}

function Step($msg) {
  Write-Host "`n==> $msg" -ForegroundColor Cyan
}

Step "Validação de repositório"
$inside = git rev-parse --is-inside-work-tree 2>$null
if ($inside -ne "true") { Fail "Pasta atual não é um repositório git." }

Step "Atualizando refs remotas"
git fetch origin --prune | Out-Null

Step "Validando branch atual"
$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne $Branch) {
  Fail "Deploy bloqueado: branch atual '$currentBranch'. Troque para '$Branch'."
}

Step "Validando status limpo"
$status = git status --porcelain
if ($status) {
  Write-Host "Arquivos pendentes:" -ForegroundColor Yellow
  $status | ForEach-Object { Write-Host "  $_" }
  Fail "Deploy bloqueado: há alterações locais não commitadas."
}

Step "Sincronizando branch local com origin/$Branch"
git pull --ff-only origin $Branch

Step "Build de produção"
npm run build

Step "Deploy Vercel produção"
$deployOutput = vercel --prod --yes
$deployOutput | ForEach-Object { Write-Host $_ }

$prodUrl = ($deployOutput | Select-String -Pattern "Production:\s+(https://\S+)" | ForEach-Object { $_.Matches[0].Groups[1].Value } | Select-Object -Last 1)
$aliasUrl = ($deployOutput | Select-String -Pattern "Aliased:\s+(https://\S+)" | ForEach-Object { $_.Matches[0].Groups[1].Value } | Select-Object -Last 1)

Step "Resumo"
Write-Host "Branch: $currentBranch"
if ($prodUrl) { Write-Host "Deploy: $prodUrl" }
if ($aliasUrl) { Write-Host "Alias:  $aliasUrl" }
Write-Host "`nDeploy seguro concluído." -ForegroundColor Green
