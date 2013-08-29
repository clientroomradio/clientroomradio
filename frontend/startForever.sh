echo "Starting app.js in a loop. Find logs in app.log"
echo "You might want to start this in a screen like this:"
echo "$ screen -dmS nodeForeverInALoop \"./startForever.sh\" && sleep 1 && tail -f ./app.log"
echo 

while :
do
	echo "#### RESTARTING `date` ####" >> app.log
	node app.js | tee -a app.log
	echo "Sleeping one second. Press [CTRL+C] to stop.."
	sleep 1
done