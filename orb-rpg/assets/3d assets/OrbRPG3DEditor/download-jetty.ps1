$M2 = "$env:USERPROFILE\.m2\repository"

$jars = @(
    "org/eclipse/jetty/jetty-server/11.0.18/jetty-server-11.0.18.jar",
    "org/eclipse/jetty/jetty-http/11.0.18/jetty-http-11.0.18.jar",
    "org/eclipse/jetty/jetty-util/11.0.18/jetty-util-11.0.18.jar",
    "org/eclipse/jetty/jetty-io/11.0.18/jetty-io-11.0.18.jar",
    "org/eclipse/jetty/jetty-servlet/11.0.18/jetty-servlet-11.0.18.jar",
    "org/eclipse/jetty/jetty-servlets/11.0.18/jetty-servlets-11.0.18.jar",
    "org/eclipse/jetty/jetty-security/11.0.18/jetty-security-11.0.18.jar",
    "jakarta/servlet/jakarta.servlet-api/5.0.0/jakarta.servlet-api-5.0.0.jar"
)

foreach ($jar in $jars) {
    $dest = Join-Path $M2 $jar
    $dir = Split-Path $dest -Parent
    
    if (!(Test-Path $dest)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        $url = "https://repo1.maven.org/maven2/$jar"
        Write-Host "Downloading $jar..."
        Invoke-WebRequest -Uri $url -OutFile $dest
    } else {
        Write-Host "Already exists: $jar"
    }
}

Write-Host "Done!"
