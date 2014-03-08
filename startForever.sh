echo "Starting app.js in a loop."
echo 

while :
do
    echo "#### RESTARTING `date` ####"
    nodejs app.js
    echo "Sleeping one second. Press [CTRL+C] to stop.."
    sleep 1
done