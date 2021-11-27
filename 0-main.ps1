Get-ChildItem bucket | ForEach-Object {
    # remove all `"depends": "sudo",` part
    busybox sed -i "/depends/ d" $_.FullName

    # remove all `"",` part
    busybox sed -i '/\ \"\",$/ d' $_.FullName

    # replace all `-filter` to `-Filter`
    busybox sed -i "s/-filter/-Filter/g" $_.FullName

    # replace all `-Filter 'sarasa` to `-Filter '`
    busybox sed -i "s/-Filter 'sarasa/-Filter '/g" $_.FullName

    # replace all `\"$dir\"` to `$dir`
    busybox sed -i 's/\\\\\"\$dir\\\\\"/$dir/g' $_.FullName

    # remove all `is_admin check`
    busybox sed -i "/is_admin/ d; /Administrator\ rights\ are\ required\ to\ install/ d; /exit\ 1/ d" $_.FullName
    node "1-remove-remaining-close-bracket-of-is-admin-check.mjs" $_.FullName

    # patch
    node "2-patch.mjs" $_.FullName
}
