param (
    [string]$user,
    [string]$newp
)
$ErrorActionPreference = 'Continue'
try{
Set-ADUser -Identity $user -CannotChangePassword $false
Set-ADAccountPassword -Identity $user -NewPassword (ConvertTo-SecureString -AsPlainText $newp -Force) -Reset
$r=0
$erreur=""
}catch{
$erreur=$_.Exception.Message
$r=2  
}
Set-ADUser -Identity $user -CannotChangePassword $true
if ($r -ne 0){
	$ErrorActionPreference = 'Continue'
	write-Error "| $erreur |"
}else{
write-output "OK"
}
Exit $r
