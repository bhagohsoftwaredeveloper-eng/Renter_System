!macro customInstall
  DetailPrint "Creating ServeQueue Admin and Terminal shortcuts..."
  CreateShortCut "$DESKTOP\ServeQueue Admin.lnk" "$appExe" "--admin"
  CreateShortCut "$DESKTOP\ServeQueue Terminal.lnk" "$appExe" "--terminal"
  
  CreateDirectory "$SMPROGRAMS\ServeQueue"
  CreateShortCut "$SMPROGRAMS\ServeQueue\ServeQueue Admin.lnk" "$appExe" "--admin"
  CreateShortCut "$SMPROGRAMS\ServeQueue\ServeQueue Terminal.lnk" "$appExe" "--terminal"
!macroend

!macro customUninstall
  Delete "$DESKTOP\ServeQueue Admin.lnk"
  Delete "$DESKTOP\ServeQueue Terminal.lnk"
  RMDir /r "$SMPROGRAMS\ServeQueue"
!macroend
