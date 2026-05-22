$file = 'D:\Projects\collabryx\components\features\onboarding\step-skills.tsx'
$content = Get-Content $file
$result = @()

for ($i = 0; $i -lt $content.Count; $i++) {
    $line = $content[$i]
    $trimmed = $line.TrimStart()
    
    if ($trimmed.StartsWith('const role = watch("role")')) {
        $indent = $line.Substring(0, $line.Length - $trimmed.Length)
        $result += $indent + '// Get role from form context - detect from headline text'
        $result += $indent + 'const headline = watch("headline") || ""'
        $result += $indent + 'const detectedRole = Object.keys(ROLE_SKILL_SUGGESTIONS).find(role => headline.toLowerCase().includes(role.toLowerCase())) || null'
        continue
    }
    
    if ($trimmed.StartsWith('const roleSuggestions = role')) {
        $indent = $line.Substring(0, $line.Length - $trimmed.Length)
        $result += $indent + 'const roleSuggestions = detectedRole ? ROLE_SKILL_SUGGESTIONS[detectedRole] : POPULAR_SKILLS'
        continue
    }
    
    $result += $line
}

[System.IO.File]::WriteAllLines($file, $result)
Write-Host "Done. Applied fix 18."
