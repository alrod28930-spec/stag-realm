; NSIS Installer Script for StagAlgo Desktop
; Requests necessary permissions during installation

!include "MUI2.nsh"
!include "FileFunc.nsh"

; Custom pages and macros
!define MUI_CUSTOMFUNCTION_GUIINIT myGuiInit

; Request permissions function
Function RequestPermissions
  ; Show permission request dialog
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "StagAlgo requires the following permissions for full functionality:$\r$\n$\r$\n• Microphone access for voice trading commands$\r$\n• Speaker access for audio alerts$\r$\n• Network access for market data$\r$\n• File system access for data storage$\r$\n$\r$\nGrant these permissions now?" \
    IDYES GrantPermissions IDNO SkipPermissions
    
  GrantPermissions:
    DetailPrint "Configuring system permissions..."
    
    ; Add firewall exception (Windows Defender)
    ExecWait 'netsh advfirewall firewall add rule name="StagAlgo" dir=in action=allow program="$INSTDIR\StagAlgo.exe"' $0
    
    ; Set registry keys for microphone access
    WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone" "Value" "Allow"
    
    DetailPrint "Permissions configured successfully"
    Goto PermissionsDone
    
  SkipPermissions:
    DetailPrint "Permissions skipped - can be configured later in Windows Settings"
    
  PermissionsDone:
FunctionEnd

; Custom GUI initialization
Function myGuiInit
  ; Custom installer appearance
  SetBrandingImage "build\installer-banner.bmp"
FunctionEnd

; Installation completion
Function .onInstSuccess
  ; Call permission setup
  Call RequestPermissions
  
  ; Create desktop shortcut
  CreateShortCut "$DESKTOP\StagAlgo.lnk" "$INSTDIR\StagAlgo.exe" "" "$INSTDIR\StagAlgo.exe" 0
  
  ; Register file associations
  WriteRegStr HKCR ".stagalgo" "" "StagAlgoFile"
  WriteRegStr HKCR "StagAlgoFile" "" "StagAlgo Trading File"
  WriteRegStr HKCR "StagAlgoFile\DefaultIcon" "" "$INSTDIR\StagAlgo.exe,0"
  WriteRegStr HKCR "StagAlgoFile\shell\open\command" "" '"$INSTDIR\StagAlgo.exe" "%1"'
  
  ; Add to Windows startup (optional)
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Would you like StagAlgo to start automatically with Windows?" \
    IDYES AddStartup IDNO SkipStartup
    
  AddStartup:
    WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Run" "StagAlgo" "$INSTDIR\StagAlgo.exe --startup"
    
  SkipStartup:
  
  ; Show completion message
  MessageBox MB_OK|MB_ICONINFORMATION \
    "StagAlgo has been successfully installed!$\r$\n$\r$\nYou can now launch it from the desktop shortcut or Start menu.$\r$\n$\r$\nFor voice features to work properly, please ensure your microphone is connected and working."
FunctionEnd

; Uninstaller
Function un.onInit
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Are you sure you want to completely remove StagAlgo and all of its components?" \
    IDYES Confirmed IDNO Cancelled
    
  Cancelled:
    Abort
  Confirmed:
FunctionEnd

Function un.onUninstSuccess
  ; Clean up registry entries
  DeleteRegKey HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Run\StagAlgo"
  DeleteRegKey HKCR ".stagalgo"
  DeleteRegKey HKCR "StagAlgoFile"
  
  ; Remove firewall rule
  ExecWait 'netsh advfirewall firewall delete rule name="StagAlgo"'
  
  MessageBox MB_OK|MB_ICONINFORMATION "StagAlgo has been successfully removed from your computer."
FunctionEnd