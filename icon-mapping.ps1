# Icon name mapping from Ionicons to MaterialCommunityIcons  
$iconMaps = @{
    'add-circle-outline' = 'plus-circle-outline'
    'alert' = 'alert'
    'alert-circle' = 'alert-circle'
    'analytics' = 'chart-line'
    'analytics-outline' = 'chart-line'
    'arrow-up' = 'arrow-up'
    'barbell' = 'dumbbell'
    'barbell-outline' = 'dumbbell'
    'battery-half' = 'battery-50'
    'beaker-outline' = 'beaker-outline'
    'bed-outline' = 'bed-outline'
    'bicycle' = 'bike'
    'bicycle-outline' = 'bike'
    'body' = 'human'
    'body-outline' = 'human-male'
    'bulb' = 'lightbulb'
    'bulb-outline' = 'lightbulb-outline'
    'chatbubble-ellipses' = 'message-text'
    'chatbubble-ellipses-outline' = 'message-text-outline'
    'checkmark' = 'check'
    'checkmark-circle' = 'check-circle'
    'chevron-back' = 'chevron-left'
    'chevron-forward' = 'chevron-right'
    'cloudy-outline' = 'weather-cloudy'
    'color-palette' = 'palette'
    'female' = 'gender-female'
    'female-outline' = 'gender-female'
    'fitness' = 'run'
    'fitness-outline' = 'run'
    'flame' = 'fire'
    'flame-outline' = 'fire'
    'flash' = 'flash'
    'flash-outline' = 'flash-outline'
    'footsteps' = 'walk'
    'footsteps-outline' = 'walk'
    'heart' = 'heart'
    'help' = 'help-circle'
    'home' = 'home'
    'home-outline' = 'home-outline'
    'information-circle' = 'information'
    'leaf' = 'leaf'
    'leaf-outline' = 'leaf'
    'male' = 'gender-male'
    'male-outline' = 'gender-male'
    'moon' = 'moon-waning-crescent'
    'moon-outline' = 'moon-waning-crescent'
    'notifications' = 'bell'
    'nutrition-outline' = 'food-apple-outline'
    'pause-circle-outline' = 'pause-circle-outline'
    'person' = 'account'
    'play' = 'play'
    'play-circle-outline' = 'play-circle-outline'
    'pulse' = 'pulse'
    'pulse-outline' = 'pulse'
    'radio-button-on' = 'radiobox-marked'
    'refresh' = 'refresh'
    'remove' = 'minus'
    'resize-outline' = 'resize'
    'server' = 'server'
    'settings' = 'cog'
    'settings-outline' = 'cog-outline'
    'shield-checkmark-outline' = 'shield-check-outline'
    'sparkles' = 'shimmer'
    'sparkles-outline' = 'shimmer'
    'speedometer-outline' = 'speedometer'
    'stop-circle-outline' = 'stop-circle-outline'
    'sunny' = 'weather-sunny'
    'swap-vertical' = 'swap-vertical'
    'sync-outline' = 'sync'
    'thermometer' = 'thermometer'
    'thermometer-outline' = 'thermometer'
    'time' = 'clock'
    'time-outline' = 'clock-outline'
    'timer' = 'timer'
    'timer-outline' = 'timer-outline'
    'trash' = 'delete'
    'trending-down' = 'trending-down'
    'trending-up' = 'trending-up'
    'trending-up-outline' = 'trending-up'
    'walk' = 'walk'
    'walk-outline' = 'walk'
    'warning' = 'alert'
    'watch' = 'watch'
    'watch-outline' = 'watch'
    'water' = 'water'
    'water-outline' = 'water-outline'
}

# Process all .tsx files
Get-ChildItem -Path "c:\Users\berka\Desktop\elva\mobile" -Recurse -Filter "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $modified = $false
    
    foreach ($oldIcon in $iconMaps.Keys) {
        $newIcon = $iconMaps[$oldIcon]
        # Replace name="oldIcon" with name="newIcon"
        if ($content -match "name=`"$oldIcon`"") {
            $content = $content -replace "name=`"$oldIcon`"", "name=`"$newIcon`""
            $modified = $true
        }
        # Replace name='oldIcon' with name='newIcon'
        if ($content -match "name='$oldIcon'") {
            $content = $content -replace "name='$oldIcon'", "name='$newIcon'"
            $modified = $true
        }
        # Replace icon: 'oldIcon' with icon: 'newIcon'
        if ($content -match "icon:\s*'$oldIcon'") {
            $content = $content -replace "icon:\s*'$oldIcon'", "icon: '$newIcon'"
            $modified = $true
        }
        # Replace icon: "oldIcon" with icon: "newIcon"
        if ($content -match "icon:\s*`"$oldIcon`"") {
            $content = $content -replace "icon:\s*`"$oldIcon`"", "icon: `"$newIcon`""
            $modified = $true
        }
    }
    
    if ($modified) {
        Set-Content -Path $_.FullName -Value $content -NoNewline
        Write-Host "Updated: $($_.Name)"
    }
}

Write-Host "Icon mapping complete!"
