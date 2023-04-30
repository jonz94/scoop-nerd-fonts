Get-ChildItem bucket | ForEach-Object {
    # node healthcheck.mjs
    # patch
    node "1-patch.mjs" $_.FullName

    # sort the order of the properties
    node "2-sort.mjs" $_.FullName
}
