echo "Starting backend.js in a loop. Find logs in backend.log"
echo "You might want to start this in a screen like this:"
echo "$ screen -dmS nodeForeverInALoop \"./startForever.sh\" && sleep 1 && tail -f ./backend.log"
echo 

while :
do
	echo "#### RESTARTING `date` ####"
	nodejs backend.js
	echo "Sleeping one second. Press [CTRL+C] to stop.."
	sleep 1
done