function GameState() {
	//this.level = 1;
	console.log("start");
	this.taskUrl = 'https://dl.dropboxusercontent.com/u/52559094/GState/tasks.json'
	this.win = false;
	this.players = [];
	this.overallHealth = 100;
	this.listOfExpirations = {}; // dictionary of task_id: {startTime: #start, timeDur: #timeMs}
	this.listOfPeopleWithTasks = {};
	var list = [];
	//console.log("hello");
	$.ajax({
  		dataType: "json",
  		url: this.taskUrl,
  		success: function(data){
  			list = data;
  		},
  		async: false
	});
	this.listOfFuncs = list;

	//this.listOfFuncs = this.listOfFuncs[1];
	this.timeDur = 5000;
	this.state = null;
	this.metadata = null;
	this.addedKeys = [];

	console.log("Arr " + this.listOfFuncs);
	this.i = 0;

	this.initializeTask = function(task, userId){
		task.task_id = this.i;
		this.i++;
		task.expiration = new Date();
		//console.log(task.expiration.getMilliseconds());
		task.expiration.setMilliseconds(task.expiration.getMilliseconds() + this.timeDur);
		task.userId = userId;
		task.done = false;
		return task;
	}

	//now we start
	this.start = function() {
		this.players = gapi.hangout.getParticipants();
		var taskLists = {};
		var check = {};
		var numPlayers = this.players.length;

		function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
		};
		var i = 0;
		var taskLists = {};
		for(var j =0; j < numPlayers; j++) {
			taskLists[this.players[j]] = {};
			taskLists[this.players[j]].tasklist = [];
		}
		this.listOfFuncs = shuffle(this.listOfFuncs);
		var newFuncs = [];
		while(i<numPlayers*4){
			var id = this.players[Math.floor(i/4)];
			taskLists[id].tasklist.push(this.listOfFuncs[i]);
			this.listOfPeopleWithTasks[id] = false;
			newFuncs.push(this.listOfFuncs[i]);
			this.listOfExpirations[this.listOfFuncs[i].name] = this.listOfFuncs[i];
			i++;
		}
		this.listOfFuncs = newFuncs;
		/*for(var i = 0; i < this.players.length; i++) { //2 players for 
			this.listOfPeopleWithTasks[this.players[i].id] = false;
			taskLists[this.players[i]] = {};
			taskLists[this.players[i]].tasklist = [];
			for(var j = 0; j < 4; j++) {
				var randomFunc = Math.floor(Math.random()*3);
				var possibleFunc = this.listOfFuncs[randomFunc];

				for(var i=0;i<2000;i++) {
					if(check[possibleFunc] == undefined) {
						taskLists[this.players[i]].tasklist.push(possibleFunc);
						check[possibleFunc] = true;
						break;
					} else {
						randomFunc = Math.floor(Math.random()*3);
						possibleFunc = this.listOfFuncs[randomFunc];
					}
				}
			}
		}*/

		this.update();

	}

	//this updates the render and sends instructions.
	this.update = function() {
		var peopleID =  Object.keys(this.listOfPeopleWithTasks);

		for (var i = 0; i < this.addedKeys.length; i++) {
			var key = this.addedKeys[i];
			var name = this.listOfPeopleWithTasks[key].name;
			console.log(this.listOfExpirations[name]);
			console.log(this.listOfExpirations);
			this.checkTaskComplete(this.listOfExpirations[name]);
			delete this.listOfExpirations[name];
		};

		for (var i = 0; i < peopleID.length; i++) {
			//if the person doesn't have a task, 
			if(!this.listOfPeopleWithTasks[peopleID[i]]) {
				var task = this.randomizeFunc(peopleID[i]);
				console.log(task);
				gapi.hangout.data.setValue(task["name"].name, JSON.stringify(task["name"]));
			}
		} 

		//remove from sharedstate old completed tasksole.
		
		gapi.hangout.data.submitDelta({}, this.addedKeys);


		//if your health goes below;
		if (this.overallHealth <= 0) {
			end("YOU LOST!!!!!");
		}

	}


	//the check function
	this.checkTaskComplete = function(taskObject) {
		//if the thing in the array isn't undefined
		if (this.listOfExpirations[taskObject.task_id] != undefined) {
			//if it's greater than the duration time
			if (Date.now() > this.listOfExpirations[taskObject.task_id].expiration.getMilliseconds()) {
				this.overallHealth = this.overallHealth - 10;
				this.listOfPeopleWithTasks[taskObject.userId] = false;
			}
		}
	}

	this.randomizeFunc = function(person_id) {
		console.log(this.i);
		var randomID = this.listOfFuncs[this.randomizeNum("func")];
		var task = this.initializeTask(randomID, person_id);
		var name = randomID[name];
		var itemToSend = {name: task};

		this.listOfExpirations[randomID.name] = task;
		this.listOfPeopleWithTasks[person_id] = true;
		
		return itemToSend;

	}

	this.randomizeNum = function(option) {
		if(option == "func") {
			return Math.floor(Math.random()*this.listOfFuncs.length);
		} else if (option == "number") {
			return Math.floor(Math.random()*1);
		}
	}

	function end(message) {
		//render("Lose"); //see the lose screen
		console.log("YOU LOSE");
		alert("YOU LOSE");
	}

}

function updateLocalDataState(state, metadata, addedKeys) {
	game.state = state;
	game.metadata = metadata;
	game.addedKeys = addedKeys;

	game.update(); //render based on this
}

 var game = new GameState();

(function() {
	console.log("initializing..");
	if(gapi && gapi.hangout) {

		//initialize the hangout
		var initHangout = function(apiInitEvent) {
			if(apiInitEvent.isApiReady) {
				//when the state of the game changes, change the local state also
				gapi.hangout.data.onStateChanged.add(function(stateChangeEvent) {
          updateLocalDataState(stateChangeEvent.state,
                               stateChangeEvent.metadata, stateChangeEvent.addedKeys);
        });

        //if there is no initial game state, then get the shared state

        if (!game.state) {
          var state = gapi.hangout.data.getState();
          var metadata = gapi.hangout.data.getStateMetadata();
          var addedKeys = [];
          if (state && metadata) {
            updateLocalDataState(state, metadata, addedKeys);
          }
        }
        gapi.hangout.onApiReady.remove(initHangout);
        game.start();
			}
		}
		gapi.hangout.onApiReady.add(initHangout);
	}
})();
