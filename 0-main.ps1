Get-ChildItem bucket | ForEach-Object {
    # patch
    node "1-patch.mjs" $_.FullName

    # add `"depends": "scoop-nerd-fonts-helper",` part, also sort the order of the properties
    #node "2-add-depends-and-sort.mjs" $_.FullName
}
