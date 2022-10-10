
/* PREDEFINED */

var maxLettersPostTitle = 23;

/* USER DEFINED */

var maxLinesPostTitle = 5;
var iconsPosition = "right";
var maxLoadedPosts = 100;
var amountOfPostsToLoad = 10;
var autoPostLoadingTimeout = 10;
var preloading = true;
var subs = [];
var currentColors = {"text":"","background":"","accent":""};
var savedPosts = {};

/* IMPORTANT INIT */

var currentPage = "main";
var loadedSubs = [];
var knownSubData = {};
var loadedPosts = [];
var knownPostData = {};
var postsBeingLoaded = [];
var subResults = [];
var sel;
var updateTextFunc;
var nsfw = 1;
var shadeElement = document.getElementById("shade");

/* SCROLLING INIT */

var toTravel = 0;
var traveled = 0;
var offset = 0;
var elScroller = null;
var change = 0;

var totalZoom = 0;
var oldZoom = 0;
var maxZoom = 1000;
var winWidth = window.innerWidth;
var objHeight = 0;

/* SUB FAVS */

function readData() {
    tizen.filesystem.resolve("documents", function(dir) 
    {
       var file = dir.resolve("DropForReddit/data.json");
       try {
       	if (!file.fileSize>0) createDataFile();
       } catch(e) {
       	createDataFile();
       }
       file.openStream(
            "r", 
            function(fs) {
            	if(file.fileSize>0) {
                    var text = fs.read(file.fileSize);       
                    fs.close();
                    var obj  = JSON.parse(text);
                    
                    try{
                    	subs = obj.subs;
                 		loadMySubs();
                 		writeSubsToFile();
                 	} catch(e) {}
                 	
                 	try{
                 		currentColors = obj.currentColors;
                 	} catch(e) {}
                 	
                 	try{
                 		savedPosts = obj.savedPosts;
                 	} catch(e) {}
                 }
            }, function(e) {
            }, "UTF-8");
    });
}

function favsAddSub(sub) {
	if (!subs.includes(sub)) subs.push(sub);
	loadMySubs()
	writeDataToFile();
}

function favsRemoveSub (sub) {
	if (subs.includes(sub)) subs.splice(subs.indexOf(sub), 1);
	loadMySubs()
	writeDataToFile();
}

function favsCheckSub (sub) {
	return subs.includes(sub);
}

function writeDataToFile () {
	tizen.filesystem.resolve("documents", function(dir) {
		var file = dir.resolve("DropForReddit/data.json");  

        file.openStream(
                "w",
                function(fs) {
                    var allData = {"subs":subs,"currentColors":currentColors,"savedPosts":savedPosts};
                    fs.write(JSON.stringify(allData));
                    fs.close();
                }, function(e) {
                }, "UTF-8");
    });
}

function createDataFile() {
	tizen.filesystem.resolve("documents", function(dir) {
        var res = dir.createDirectory("DropForReddit");
        var file = res.createFile("data.json");
        readData();
    });
}

/* EVENTS */

function toggleNSFW() {nsfw = nsfw >= 2 ? 0 : nsfw+1}
function currentNSFW() {
	switch(nsfw) {
		case 0:
			return("<span style=\"color:#137006\">Only SFW</span>");
			break;
		case 1:
			return("<span style=\"color:#d8db18\">Both</span>");
			break;
		case 2:
			return("<span style=\"color:#db2e2e\">Only NSFW</span>");
			break;
	}
}

window.onload = function() {
	//createDataFile()
	readData();
	writeDataToFile();
	readData();
};

function onSearchButtonPress () {
	changePageTo("search");
}

function searchSubs() {
	var query = document.getElementById("subredditSearchQuery").value;
	if (subResults.includes(query)) {
		changePageTo("result_" + query);
	} else {
		changePageTo("loading");
		listSubResults();
	}
}

function onSubredditButtonPress () {
	var subreddit = this.parentElement.id.slice(0,-3);
	if (!loadedSubs.includes(subreddit)) {
		changePageTo("loading");
		loadPosts(subreddit);
	} else {
		if(((new Date()).getTime() - (new Date(document.getElementById("page_" + subreddit).getAttribute("updated"))).getTime()) > 3600000) {
			changePageTo("loading",false);
			document.getElementById("page_" + subreddit).remove();
			loadPosts(subreddit);
		} else {
			changePageTo("page_" + subreddit);
		}
	}
}

function linkToSub (subreddit,isUser=false) {
	if (subreddit.startsWith("$SFW$_")) {
		nsfw = 0;
		subreddit = subreddit.substr(6);
	}
	if (isUser) subreddit = "$USER$_" + subreddit;
	if (!loadedSubs.includes(subreddit)) {
		changePageTo("loading");
		loadPosts(subreddit);
	} else {
		var prefix = isUser ? "user_" : "page_";
		if(((new Date()).getTime() - (new Date(document.getElementById(prefix + subreddit.substr(7)).getAttribute("updated"))).getTime()) > 3600000) {
			changePageTo("loading",false);
			document.getElementById(prefix + subreddit.substr(7)).remove();
			loadPosts(subreddit);
		} else {
			changePageTo(prefix + subreddit.substr(7));
		}
	}
}

var postScrollTo = "";

function onPostButtonPress () {
	if(this.parentElement.getAttribute("type")=="comment") postScrollTo = this.parentElement.getAttribute("comment-id");
	var subreddit = this.parentElement.getAttribute("sub");
	var post = this.parentElement.id.substring(12);
	if (!loadedPosts.includes(subreddit + "_" + post)) {
		if (postsBeingLoaded.includes(subreddit + "_" + post)) {
			changePageTo("loading");
			function checkIfPostExistsThenTp() {
				if (currentPage == "loading") {
					if (document.getElementById("page_" + subreddit + "_" + post)) {
						changePageTo("page_" + subreddit + "_" + post);
					} else {	
						setTimeout(function(){
							checkIfPostExistsThenTp()
						}, 500);
					}
				}
			}
		} else {
			showPost(subreddit,post,true);
		}
	} else {
		changePageTo("page_" + subreddit + "_" + post);
	}
}

function onPostsMorePress (e) {
	var name = e.parentElement.id;
	var subreddit = e.parentElement.getAttribute("sub");
	
		var popupCircle = document.createElement("div");
	popupCircle.id = "postsOptions";
	popupCircle.setAttribute("class","ui-popup");
	document.querySelector("#" + name).appendChild(popupCircle);
	
	var selector = document.createElement("div");
	selector.id = "selector";
	selector.setAttribute("class","ui-selector");
	popupCircle.appendChild(selector);
	
	var index = 0;
	
	function createOption(name,icon) {
		var option = document.createElement("div");
		option.setAttribute("class","ui-item " + icon);
		option.setAttribute("data-index",index.toString());
		option.setAttribute("data-title",name);
		selector.appendChild(option);
		index++
	}
	
	createOption("Refresh","show-icon");
	if (favsCheckSub(subreddit)){
		createOption("Unfavorite","fail-icon");
	} else {
		createOption("Favorite","fail-icon");
	}	
	createOption("Subreddit Info","show-icon");
	createOption("Home Page","show-icon");
	createOption(`NSFW Mode`,"show-icon");
	
		var radius = window.innerHeight / 2 * 0.8;
	sel = tau.widget.Selector(e.parentElement.querySelector(".ui-selector"), {itemRadius: radius});
	tau.openPopup(e.parentElement.querySelector(".ui-popup"));
	e.parentElement.querySelector(".ui-popup").setAttribute("class","ui-popup ui-popup-active");
	
	
	document.querySelector(".ui-selector").addEventListener("click",function(){ 		
		var type = document.querySelector(".ui-selector-indicator").getAttribute("data-index");
		var sub = document.getElementById("postsOptions").parentElement.getAttribute("sub");
		var args = document.getElementById("postsOptions").parentElement.getAttribute("args");
		var urlSearch = document.getElementById("postsOptions").parentElement.getAttribute("urlSearch");
		if (args != "") args = "?" + args.substr(1);
		var name = document.getElementById("postsOptions").parentElement.id;
		if (type==0) {
			tau.closePopup();
			destroySel();
			changePageTo("loading",false);
			document.getElementById(name).remove();
			loadPosts(sub + urlSearch + args);
		}
		if (type==1) {
			tau.closePopup();
			if (favsCheckSub(sub)) {
				favsRemoveSub(sub);
				createConfirmPopup("Successfully removed from favorites");
			} else {
				favsAddSub(sub);
				createConfirmPopup("Successfully added to favorites");
			}
			destroySel();	
		}
		if (type==2) {
			tau.closePopup();
			destroySel();
			viewSubInfo(sub);
		}
		if (type==3) {
			tau.closePopup();
			backToHome();
			destroySel();
		}
		if (type==4) {
			toggleNSFW();
			document.querySelector(".ui-selector-indicator").querySelector(".ui-selector-indicator-text").innerHTML = `NSFW Mode\n${currentNSFW()}`;
		}
	});
	
	updateTextFunc = setInterval(function(){
		if (document.querySelector(".ui-selector")) {
			if (document.querySelector(".ui-selector-indicator").getAttribute("data-index") == 4) {
				document.querySelector(".ui-selector-indicator").querySelector(".ui-selector-indicator-text").innerHTML = `NSFW Mode:\n${currentNSFW()}`;
			}
		}
	}, 150);
	
}

function onSubmissionPressMore (e) {
	var post = e.parentElement.id.match(/(_[A-Za-z0-9]*\b)/g)[0].substring(1);
	var subreddit = e.parentElement.id.substring(5).slice(0,-1*(1+post.length));
	var user = e.parentElement.getAttribute("author");
	
		var popupCircle = document.createElement("div");
	popupCircle.id = "postsOptions";
	popupCircle.setAttribute("class","ui-popup");
	document.querySelector("#page_" + subreddit + "_" + post).appendChild(popupCircle);
	
	var selector = document.createElement("div");
	selector.id = "selector";
	selector.setAttribute("class","ui-selector");
	popupCircle.appendChild(selector);
	
	var index = 0;
	
	function createOption(name,icon) {
		var option = document.createElement("div");
		option.setAttribute("class","ui-item " + icon);
		option.setAttribute("data-index",index.toString());
		option.setAttribute("data-title",name);
		selector.appendChild(option);
		index++
	}
	
	createOption("Refresh","show-icon");
	if ((subreddit + "_" + post) in savedPosts){
		createOption("Unsave","fail-icon");
	} else {
		createOption("Save","fail-icon");
	}	
	createOption("r/" + subreddit,"show-icon");
	createOption("u/" + user,"show-icon");
	createOption("Home Page","show-icon");
	
		var radius = window.innerHeight / 2 * 0.8;
	sel = tau.widget.Selector(e.parentElement.querySelector(".ui-selector"), {itemRadius: radius});
	tau.openPopup(e.parentElement.querySelector(".ui-popup"));
	e.parentElement.querySelector(".ui-popup").setAttribute("class","ui-popup ui-popup-active");
	
	
	document.querySelector(".ui-selector").addEventListener("click",function(){    		
		tau.closePopup();
		var type = document.querySelector(".ui-selector-indicator").getAttribute("data-index");
		if (type==0) {
			/*document.getElementById("page_" + sub).remove();
			changePageTo("loading");
			loadPosts(sub);*/
		}
		if (type==1) {
			if ((subreddit + "_" + post) in savedPosts) {
				//delete savedPosts[subreddit + "_" + post]; savedRemovePost(subreddit + "_" + post);
				createConfirmPopup("Successfully unsaved");
			} else {
				//savedAddPost(subreddit + "_" + post);
				createConfirmPopup("Successfully saved");
			}
			destroySel();	
		}
		if (type==2) {
			linkToSub(subreddit);
			destroySel();
		}
		if (type==3) {
			linkToSub(user,true);
			destroySel();
		}
		if (type==4) {
			backToHome();
			destroySel();
		}
	});
}

//setInterval(function() {
function checkIfLast() {
	var lastElement = document.querySelector('.lastInList.ui-snap-listview-selected')
  	if (lastElement !== null) {
		var wrapper = lastElement.parentElement.parentElement.parentElement.parentElement;
		var sub = wrapper.getAttribute("sub");
		var args = wrapper.getAttribute("args");
		var urlSearch = wrapper.getAttribute("urlSearch");
		if (args != "") args = "?" + args.substr(1);
  		var userPrefix = (lastElement.parentElement.getAttribute("prefix")=="r/") ? "" : "$USER$_";
	    loadPosts(userPrefix + sub + urlSearch + args,lastElement.parentElement.getAttribute("lastloaded"));
	    lastElement.setAttribute("class","ui-snap-listview-item ui-snap-listview-selecter");
	}
}
//}, 150);

/* REDDIT FUNCTIONS */

var searchQuery = "";

function listSubResults() {

	var query = document.getElementById("subredditSearchQuery").value;
	searchQuery = query;

	var xhttp = new XMLHttpRequest();
	
		xhttp.onreadystatechange = function() {
		
		if (this.readyState == 4 && this.status == 200) {
			var results = JSON.parse(this.responseText).data.children;
  			var postsList = null;

  			var postsPage = document.querySelector("#result_" + query);
  			if (postsPage == null) {
   				postsPage = document.createElement("div");
   				postsPage.id = "result_" + query;
   				postsPage.setAttribute("class","ui-page");
   				postsPage.setAttribute("updated",new Date());
   				document.getElementById("everything").appendChild(postsPage);
   				
   				var outerDiv = document.createElement("div");
	 			outerDiv.setAttribute("class","ui-scroller");
	 			outerDiv.setAttribute("tizen-circular-scrollbar","");
	 			postsPage.appendChild(outerDiv);
   				
   				var header = document.createElement("header");
   				header.setAttribute("class","ui-header");
   				outerDiv.appendChild(header);
   				
   				var h = document.createElement("h2");
   				h.setAttribute("class","ui-title");
   				h.innerHTML = "Search Results";
   				header.appendChild(h);
   				
   				var content = document.createElement("div");
   				content.setAttribute("class","ui-content");
   				outerDiv.appendChild(content);
   					
   				postsList = document.createElement("ul");
   				postsList.id = "resultlist_" + query;
   				postsList.setAttribute("class","ui-listview");
   				content.appendChild(postsList);
   				
   			} else {
   				postsList = document.getElementById("postslist_" + subreddit);
   			}
		
			var listHTML =	postsList;
			
			results.forEach(function(item){
			  	var li = document.createElement("li");
			  	li.id = item.data.display_name + "_li";
			  
			  	var a = document.createElement("a");
			  	a.id = "subredditButton";
			  	a.innerHTML = item.data.display_name;
			  	a.addEventListener('click', onSubredditButtonPress, false)
			  
			  	var span = document.createElement("span");
			  	span.innerHTML = item.data.public_description;
			  	span.setAttribute("class","ui-li-sub-text li-text-sub");
			  	a.appendChild(span);
			  
			  	var img = new Image();
			  	img.id = item.data.display_name + "_result_img";
			  	img.src = "/css/images/spinner.gif";
			  
			  	listHTML.appendChild(li);
			  	li.appendChild(img);
			  	li.appendChild(a);

			  	img.setAttribute("class","ul-li-thumb-" + iconsPosition);
			  	li.setAttribute("class","ui-listview ui-snap-listview li-has-thumb-" + iconsPosition);
			  	
			  	setSubIcon(item.data.display_name,true);
			});
			if (currentPage != "result_" + query) {
				subResults.push(query);
				changePageTo("result_" + query);
			}
			tauCircleReset();
			}
		};

		xhttp.onreadystatechange = function() {
		
		if (this.readyState == 4 && this.status == 200) {
			var results = JSON.parse(this.responseText).data.children;
  			var postsList = null;

  			var postsPage = document.querySelector("#result_" + query);
  			if (postsPage == null) {
   				postsPage = document.createElement("div");
   				postsPage.id = "result_" + query;
   				postsPage.setAttribute("class","ui-page");
   				postsPage.setAttribute("updated",new Date());
   				document.getElementById("everything").appendChild(postsPage);
   				
   				var outerDiv = document.createElement("div");
	 			outerDiv.setAttribute("class","ui-scroller");
	 			outerDiv.setAttribute("tizen-circular-scrollbar","");
	 			postsPage.appendChild(outerDiv);
   				
   				var header = document.createElement("header");
   				header.setAttribute("class","ui-header");
   				outerDiv.appendChild(header);
   				
   				var h = document.createElement("h2");
   				h.setAttribute("class","ui-title");
   				h.innerHTML = "Sub Results";
   				header.appendChild(h);
   				
   				var content = document.createElement("div");
   				content.setAttribute("class","ui-content");
   				outerDiv.appendChild(content);
   					
   				postsList = document.createElement("ul");
   				postsList.id = "resultlist_" + query;
   				postsList.setAttribute("class","ui-listview");
   				content.appendChild(postsList);
   				
   			} else {
   				postsList = document.getElementById("postslist_" + subreddit);
   			}
		
			var listHTML =	postsList;
			
			results.forEach(function(item){
			  	var li = document.createElement("li");
			  	li.id = item.data.display_name + "_li";
			  
			  	var a = document.createElement("a");
			  	a.id = "subredditButton";
			  	a.innerHTML = item.data.display_name;
			  	a.addEventListener('click', onSubredditButtonPress, false)
			  
			  	var span = document.createElement("span");
			  	span.innerHTML = item.data.public_description;
			  	span.setAttribute("class","ui-li-sub-text li-text-sub");
			  	a.appendChild(span);
			  
			  	var img = new Image();
			  	img.id = item.data.display_name + "_result_img";
			  	img.src = "/css/images/spinner.gif";
			  
			  	listHTML.appendChild(li);
			  	li.appendChild(img);
			  	li.appendChild(a);

			  	img.setAttribute("class","ul-li-thumb-" + iconsPosition);
			  	li.setAttribute("class","ui-listview ui-snap-listview li-has-thumb-" + iconsPosition);
			  	
			  	setSubIcon(item.data.display_name,true);
			});
			if (currentPage != "result_" + query) {
				subResults.push(query);
				changePageTo("result_" + query);
			}
			tauCircleReset();
			}
		};

		xhttp.open("GET", encodeURI("https://www.reddit.com/subreddits/search/.json?include_over_18=on&q=" + query), true);
		xhttp.send();

		loadPosts(encodeURI("$SEARCHPOSTS$_/search/.json?include_over_18=on&q=" + query + "&type=link"));
}

function loadMySubs() {
	var listHTML = document.getElementById("subredditlist");
	
	listHTML.innerHTML = "";
	
	var searchLI = document.createElement("li");
	searchLI.id = "LISearch";
	var searchA = document.createElement("a");
	searchA.innerHTML = "Search";
	searchA.addEventListener('click', onSearchButtonPress, false)
	listHTML.appendChild(searchLI);
	searchLI.appendChild(searchA);
	searchLI.setAttribute("class","ui-listview ui-snap-listview");
	
	var allLI = document.createElement("li");
	allLI.id = "all_li";
	var allA = document.createElement("a");
	allA.innerHTML = "All Subreddits";
	allA.addEventListener('click', onSubredditButtonPress, false)
	listHTML.appendChild(allLI);
	allLI.appendChild(allA);
	allLI.setAttribute("class","ui-listview ui-snap-listview");
	
	subs.forEach(function(item){
	  	var li = document.createElement("li");
	  	li.id = item + "_li";
	  
	  	var a = document.createElement("a");
	  	a.id = "subredditButton";
	  	a.innerHTML = item;
	  	a.addEventListener('click', onSubredditButtonPress, false)
	  
	  	var img = new Image();
	  	img.id = item + "_img";
	  	img.src = "/css/images/spinner.gif";
	  
	  	listHTML.appendChild(li);
	  	li.appendChild(img);
	  	li.appendChild(a);

	  	img.setAttribute("class","ul-li-thumb-" + iconsPosition);
	  	li.setAttribute("class","ui-listview ui-snap-listview li-has-thumb-" + iconsPosition);
	  	
	  	setSubIcon(item);
	});
	tauCircleReset();
}

function setSubIcon(subreddit,asResult=false) {
		var xhttp = new XMLHttpRequest();
	
		xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var data = JSON.parse(this.responseText).data;
			var icon = (data.community_icon == "") ? data.icon_img : data.community_icon;
			var res = "";
			if (asResult) res = "_result";
  			document.getElementById(subreddit + res + "_img").src = icon;
  			
  			knownSubData[subreddit] = {"publicDesc":data.public_description,"title":data.title,"descHTML":data.description_html};
			}
		};

		xhttp.open("GET", "https://www.reddit.com/r/" + subreddit + "/about/.json", true);
		xhttp.send();
}

function viewSubInfo(subreddit) {
	if (!document.getElementById("page_" + subreddit + "_info")) {
		if (subreddit in knownSubData) {
			justViewTheDataAlready()
		} else {
			var xhttp = new XMLHttpRequest();
 			xhttp.onreadystatechange = function() {
    			if (this.readyState == 4 && this.status == 200) {
    			var data = JSON.parse(this.responseText).data;
    			var icon = (data.community_icon == "") ? data.icon_img : data.community_icon;
    			var res = "";
    			if (asResult) res = "_result";
      			document.getElementById(subreddit + res + "_img").src = icon;
      			
      			knownSubData[subreddit] = {"publicDesc":data.public_description,"title":data.title,"descHTML":data_.description_html};
	   			}
	  		};
	  		xhttp.open("GET", "https://www.reddit.com/r/" + subreddit + "/about/.json", true);
	  		xhttp.send();
  		}	
  		function justViewTheDataAlready() {
  			var data = knownSubData[subreddit];
  			
  			postPage = document.createElement("div");
 			postPage.id = "page_" + subreddit + "_info";
 			postPage.setAttribute("class","ui-page");
 			document.getElementById("everything").appendChild(postPage);
 				
 			var outerDiv = document.createElement("div");
 			outerDiv.setAttribute("class","ui-scroller");
 			outerDiv.setAttribute("tizen-circular-scrollbar","");
 			outerDiv.id = "scrollable";
 			postPage.appendChild(outerDiv);
 				
 			var title = document.createElement("div");
 			title.setAttribute("class","ui-content content-padding");
 			title.setAttribute("style","color:rgba(0,149,255,1);padding-bottom:0px");
 			outerDiv.appendChild(title);	
 			title.innerHTML = "r/" + subreddit;
 				
 			var content = document.createElement("div");
 			content.setAttribute("class","ui-content content-padding");
 			content.setAttribute("style","word-wrap: break-word;padding-bottom:0px");
 			outerDiv.appendChild(content);

 			content.innerHTML = data.publicDesc + "<br><br>" + data.title;
 			
 			var descDiv = document.createElement("div");
 			descDiv.setAttribute("class","ui-content content-padding");
 			descDiv.setAttribute("style","word-wrap: break-word;font-size:25px");
 			outerDiv.appendChild(descDiv);
 			
 			descDiv.innerHTML = decodeHTML(data.descHTML);
			
			changePageTo("page_" + subreddit + "_info");
 		}
		} else {
			changePageTo("page_" + subreddit + "_info");
		}
}

function decodeHTML(html) {
    var txt = document.createElement("textarea");
    var div = document.createElement("div");
    txt.innerHTML = html;
    var result = txt.value.replace(/(<[/]*[po][l]*>)/g,"").replace(/<li>/g,"<li>• ");
    div.innerHTML = result;
    const redditURLS = ["/","https://reddit.com/","https://www.reddit.com/","http://reddit.com/","http://www.reddit.com/","www.reddit.com/","reddit.com/","http://so.reddit.com/","https://so.reddit.com/","so.reddit.com/"];
    const sfwredditURLS = ["http://so.reddit.com/","https://so.reddit.com/","so.reddit.com/"];
    div.querySelectorAll("a").forEach(e => {
    	redditURLS.forEach(url => {
    		var toSFW = sfwredditURLS.includes(url) ? "$SFW$_" : "";
			if (e.getAttribute("href").startsWith(url + "r/")) {
				e.setAttribute("onclick",`linkToSub("${toSFW + e.getAttribute("href").substr(url.length + 2)}")`);
				e.setAttribute("href","#");
			}
			if (e.getAttribute("href").startsWith(url + "u/")) {
				e.setAttribute("onclick",`linkToSub("${toSFW + e.getAttribute("href").substr(url.length + 2)}",true)`);
				e.setAttribute("href","#");
			}
			e.setAttribute("style","color: #4286f4");
		});
    });
	result = div.innerHTML;
	txt.remove();
	div.remove();
    return result;
}

function stripHTML(html) {
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
	var result = txt.value.replace(/<\/?[^>]+(>|$)/g, "");
    txt.remove();
    return result;
}

function getOffset( el ) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}
		
function loadPosts(subreddit,after="") {

	var searchPosts = false;
	if (subreddit.startsWith("$SEARCHPOSTS$_")) {
		subreddit = subreddit.substr(14);
		searchPosts = true;
	}

	var goToFirst = false;
	if (subreddit.startsWith("$TOFIRST$_")) {
		subreddit = subreddit.substr(10);
		goToFirst = true;
	}

	subreddit = decodeURI(subreddit);

	isUser = false;

	if (subreddit.endsWith("/")) subreddit = subreddit.slice(0,-1);

	if (subreddit.startsWith("$USER$_")) {
		subreddit = subreddit.substr(7);
		isUser = true;
	}
	
	prefix = "r/";
		if (isUser) prefix = "u/";
		userPrefix = isUser ? "$USER$_" : "";
		pagePrefix = isUser ? "user_" : "page_";

		var args = "&";
		if (subreddit.includes("?")) {
			subreddit = subreddit.split("?");
			args = args + subreddit[1];
			subreddit = subreddit[0];
		}
		if (args == "&") args = "";

		var urlSearch = "";
		if (subreddit.endsWith("/search")) {
			subreddit = subreddit.slice(0,-7);
			urlSearch = "/search";
			args = args + "&include_over_18=on";
		}
		if (subreddit.endsWith("/new")) {
			subreddit = subreddit.slice(0,-4);
			urlSearch = "/new";
		}
		if (subreddit.endsWith("/hot")) {
			subreddit = subreddit.slice(0,-4);
			urlSearch = "/hot";
		}
		if (subreddit.endsWith("/top")) {
			subreddit = subreddit.slice(0,-4);
			urlSearch = "/top";
		}

		if (searchPosts) {
			subreddit = "";
			prefix = "";
			pagePrefix = "postsresult_"
		}

		var xhttp = new XMLHttpRequest();
	
		xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {

			var posts = JSON.parse(this.responseText).data.children;
			var postsList = null;
			var postsPage = null;

			if (searchPosts) { 
				postsPage = document.querySelector("#" + pagePrefix + searchQuery);
			} else {
				var postsPage = document.querySelector("#" + pagePrefix + subreddit + encodeURIComponent(urlSearch + args).replace(new RegExp("%", 'g'),""));
			}
  			if (postsPage == null) {
				postsPage = document.createElement("div");
				if (searchPosts) {
					postsPage.id = pagePrefix + searchQuery;
				} else {
					postsPage.id = pagePrefix + subreddit + encodeURIComponent(urlSearch + args).replace(new RegExp("%", 'g'),"");
				}
				postsPage.setAttribute("class","ui-page");
				postsPage.setAttribute("updated",new Date());
				postsPage.setAttribute("sub",subreddit);
				postsPage.setAttribute("args",encodeURI(args));
				postsPage.setAttribute("urlSearch",urlSearch);
				postsPage.setAttribute("prefix",prefix);
				document.getElementById("everything").appendChild(postsPage);
				
				var outerDiv = document.createElement("div");
	 			outerDiv.setAttribute("class","ui-scroller");
	 			outerDiv.setAttribute("tizen-circular-scrollbar","");
	 			postsPage.appendChild(outerDiv);
				
				var header = document.createElement("header");
				header.setAttribute("class","ui-header");
				outerDiv.appendChild(header);
				
				var h = document.createElement("h2");
				h.setAttribute("class","ui-title");
				h.innerHTML = prefix + subreddit;
				h.setAttribute("style","word-wrap:break-word");
				header.appendChild(h);
				if (searchPosts) h.innerHTML = "Post Results";
				
				var content = document.createElement("div");
				content.setAttribute("class","ui-content");
				outerDiv.appendChild(content);
				
				var btn = document.createElement("button");
				btn.setAttribute("class","ui-more");
				btn.setAttribute("onclick","onPostsMorePress(this)");
				btn.innerHTML = "Options";
				postsPage.appendChild(btn);
				
				postsList = document.createElement("ul");
				postsList.id = "postslist_" + subreddit;
				postsList.setAttribute("prefix",prefix);
				postsList.setAttribute("class","ui-listview");
				content.appendChild(postsList);

			} else {
				postsList = postsPage.querySelector("#postslist_" + subreddit);
			}
			
			var loaded = 0;
			var firstSub = null;
			var firstPost = null;
			
				posts.forEach(function(item){
				
					loaded++;
					if (item.kind == "t3") {
						var thisPostID = item.data.name;
					} 
					if (item.kind == "t1") {
						var thisPostID = item.data.link_id;
					} 
				
					if ((item.kind == "t3" || item.kind == "t1") && (nsfw<2 && !item.data.over_18 || nsfw>0 && item.data.over_18)) {
						if (loaded==1) {
							firstSub = item.data.subreddit;
							firstPost = thisPostID.substr(3);
						}

  					var li = document.createElement("li");
  					li.id = "LIpostID_" + thisPostID;
  					li.setAttribute("inOrder",postsList.getElementsByClassName("ui-snap-listview-item").length);
  					li.setAttribute("sub",item.data.subreddit);
  					li.setAttribute("post",thisPostID);
  					var a = document.createElement("a");
  					a.id = "postButton";	
  					a.addEventListener('click', onPostButtonPress, false);

  					var displayScore = item.data.score;
  					if (Math.abs(displayScore) > 999) displayScore = Math.round(displayScore / 100) / 10 + "k";
  					var score = document.createElement("div");
		 			var col = "";
		 			if (item.data.score > 0) col = "rgb(255,69,0)";
		 			if (item.data.score < 0) col = "rgb(147,145,255)";
		 			if (item.data.score == 0) col = "color:rgb(147,147,147)";
		 			if (item.data.score > 0) score.innerHTML = displayScore + " ▲";
		 			if (item.data.score < 0) score.innerHTML = displayScore + " ▼";
		 			if (item.data.score == 0) score.innerHTML = 0;
		 			score.setAttribute("style",`font-size:15px;color:${col};position:absolute;top:calc(100% - 49px);left:250px;height:100%;`);

		 			//var user = document.createElement("div");
		 			//user.innerHTML = item.data.author;
		 			//user.setAttribute("style",`color:rgb(147, 147, 147);;position:absolute;top:calc(100% - 60px);left:50px;height:100%;`);

  					if (item.kind == "t1") {
  						li.setAttribute("type","comment");
  						li.setAttribute("comment-id",item.data.id);
  					} else {
  						li.setAttribute("type","post");
  					}
  					
  					postsList.appendChild(li);
  					li.appendChild(a);
  					
  					if (item.kind == "t3") {
  						var words = item.data.title.split(" ");
  					}
  					if (item.kind == "t1") {
  						var words = stripHTML(item.data.body_html).split(" ");
  					}
  					if (item.data.over_18) words.unshift("[NSFW]");
  					
  					if (item.kind == "t1") {
  						words.unshift("[Comment]");
  					}
  					
  					if (isUser || subreddit == "all" || searchPosts) {
  						words.unshift("[r/" + item.data.subreddit + "]");
  					}

  					//words.push(score.innerHTML);
  					
  					var maxWordLength = maxLettersPostTitle; 
  					var lastLineLength = 13;     					
					var splitLines = [];
					var index = 0;
					var allwords = 0;
					
					while (index<words.length && splitLines.length < maxLinesPostTitle) {
						var length = 0;
						var wordsthatwork = 0;

						while (length<maxWordLength && index < words.length) {
							wordsthatwork += 1;
							length += words[index].length;
							index++;
							if (index < words.length && length<18) length+=1;
						}

						if (length > maxWordLength && wordsthatwork>1) {
							index--;
							wordsthatwork -=1;
						}

						/*if (index>=words.length && length > lastLineLength) {
							wordsthatwork -= 1;
							index--;
							length -= words[index].length;
						}

						if (splitLines.length+1 == maxLinesPostTitle && length > lastLineLength) {
							console.log(words[0]);
						}*/

						allwords += wordsthatwork;
						splitLines.push(wordsthatwork);
					}	
					if (allwords < words.length) words[allwords-1] = words[allwords-1] + "...";	 

					index = 0;
					for (i=0;i<splitLines.length;i++) {
					  var txt = "";
					  for (j=0;j<splitLines[i];j++) {
					    txt = txt + words[index] + " ";
					    index++
					  }
					  txt.slice(0, -1);
					  
					  var span = document.createElement("spn");
				      span.setAttribute("class","ui-li-sub-text li-text-sub");
					  span.setAttribute("style","color:white");
					  
					  if (txt.startsWith("[r/" + item.data.subreddit + "]")) {
				      	var tag = document.createElement("span");
				      	tag.setAttribute("style","color:#b5b5b5");
				      	tag.innerHTML = "[r/" + item.data.subreddit + "] ";
				      	span.appendChild(tag);
				      	txt = txt.substr(item.data.subreddit.length + 5);
				      }
					  if (txt.startsWith("[Comment]")) {
				      	var tag = document.createElement("span");
				      	tag.setAttribute("style","color:#b5b5b5");
				      	tag.innerHTML = "[Comment] ";
				      	span.appendChild(tag);
				      	txt = txt.substr(10);
				      }
					  if (txt.startsWith("[NSFW]")) {
				      	var tag = document.createElement("span");
				      	tag.setAttribute("style","color:#db2e2e");
				      	tag.innerHTML = "[NSFW] ";
				      	span.appendChild(tag);
				      	txt = txt.substr(7);
				      }
					  span.innerHTML = span.innerHTML + txt;
					  a.appendChild(span);
					  li.appendChild(score);
					  //a.appendChild(user);
					  
					  var paddingList = [36,22,19,19,19,19,19,19];
					  var padding = paddingList[splitLines.length-1];
					  
					  a.setAttribute("style","font-size:20px;position:relative;padding-top:" + padding + "px;");

					  li.setAttribute("class","ui-snap-listview-item");
					}
					if (item.kind=="t3") {
						if (!(item.data.subreddit + "_" + item.data.name.substring(3) in knownPostData)) knownPostData[item.data.subreddit + "_" + item.data.name.substring(3)] = {"title":item.data.title,"selftext":item.data.selftext,"selftextHTML":item.data.selftext_html,"url":item.data.url,"score":item.data.score,"user":item.data.author,"flair":item.data.link_flair_text,"comments":"loading"}
						if (loaded<=maxLoadedPosts && preloading) showPost(item.data.subreddit,item.data.name.substring(3)); 	
					}
				}
				if (loaded == posts.length) postsList.setAttribute("lastloaded",item.kind == "t3" ? item.data.name : item.data.id);
				});
				
				var loadedPostButtons = postsList.getElementsByClassName("ui-snap-listview-item");
			if(loadedPostButtons[loadedPostButtons.length - 1]) loadedPostButtons[loadedPostButtons.length - 1].setAttribute("class","lastInList ui-snap-listview-item");	

				tauCircleReset();
				
				if (!searchPosts) {
  				if (!loadedSubs.includes(userPrefix + subreddit + encodeURIComponent(urlSearch + args).replace(new RegExp("%", 'g'),""))) loadedSubs.push(userPrefix + subreddit + encodeURIComponent(urlSearch + args).replace(new RegExp("%", 'g'),""));
  				if (goToFirst) {
  					if (firstPost) showPost("$NOHISTORY$_" + firstSub,firstPost,true);
  				} else {
      				if (!pageHistory.includes(pagePrefix + subreddit + encodeURIComponent(urlSearch + args).replace(new RegExp("%", 'g'),""))) {		
      					changePageTo(pagePrefix + subreddit + encodeURIComponent(urlSearch + args).replace(new RegExp("%", 'g'),""));
      				}
  				}
				}
				
				if (loadedPostButtons.length == 0) loadPosts((isUser ? "$USER$_" : "") + subreddit,postsList.getAttribute("lastloaded"));	
			}
		};
		if (after!="") after = "&after=" + after;
		document.getElementById("everything").setAttribute("supersecretvalue","https://www.reddit.com/" + prefix + subreddit + urlSearch + "/.json?limit=" + amountOfPostsToLoad + after + args);
		xhttp.open("GET","https://www.reddit.com/" + prefix + subreddit + urlSearch + "/.json?limit=" + amountOfPostsToLoad + after + args, true);
		xhttp.send();
}

function formatComments(data) {
	function crawlComments(base,lvl) {
		var responses = [];
		base.forEach(function(child){
			if (child.data.body_html != undefined) {
				var childData = {};
				childData.text = child.data.body_html;
				childData.author = child.data.author;
				childData.score = child.data.score
				childData.isEdited = child.data.edited;
				childData.created = child.data.created_utc;
				childData.id = child.data.id;
				if (child.data.replies == "" || !child.data.replies || child.data.replies == undefined) {
					childData.children = [];
				} else {
					childData.children = crawlComments(child.data.replies.data.children,lvl+1);
				}
				if (childData.children.length > 3 || lvl == 2) childData.collapseChildren = true;
				responses.push(childData);
			}
		});
		return(responses);
	}
	return(crawlComments(data.data.children,0));
}

function showPost(subreddit,post,tp=false) {
	var noHistory = true;
	if (subreddit.startsWith("$NOHISTORY$_")) {
		subreddit = subreddit.substr(12);
		noHistory = false;
	}
	if (!document.getElementById("page_" + subreddit + "_" + post)) {
		var postData = null;
		postsBeingLoaded.push(subreddit + "_" + post);
		
		if ((subreddit + "_" + post) in knownPostData) {
			var knownData = knownPostData[subreddit + "_" + post];
			if (!("comments" in knownData)) {
				postData = {"title":knownData.title,"selftext":knownData.selftext,"selftextHTML":knownData.selftextHTML,"url":knownData.url,"score":knownData.score,"user":knownData.user,"flair":knownData.flair,"comments":"loading"};
			} else {
				postData = {"title":knownData.title,"selftext":knownData.selftext,"selftextHTML":knownData.selftextHTML,"url":knownData.url,"score":knownData.score,"user":knownData.user,"flair":knownData.flair,"comments":knownData.comments};
			}
			loadthispostrighthere();
			if (postData.comments == "loading") {
				var xhttp = new XMLHttpRequest();
 				xhttp.onreadystatechange = function() {
	    			if (this.readyState == 4 && this.status == 200) {
						var receivedComments = JSON.parse(this.responseText)[1];
						knownPostData[subreddit + "_" + post].comments = formatComments(receivedComments);
						if (tp) setTimeout(function(){loadComments(subreddit + "_" + post)}, 100);
	 				}
	 			}
	 			xhttp.open("GET", "https://www.reddit.com/r/" + subreddit + "/comments/" + post + "/.json", true);
		  		xhttp.send();
			} else {
				if (tp) loadComments(subreddit + "_" + post);
			}
			
			
		} else {
			var xhttp = new XMLHttpRequest();
				xhttp.onreadystatechange = function() {
    			if (this.readyState == 4 && this.status == 200) {
					var receivedData = JSON.parse(this.responseText)[0].data.children[0].data;
					var receivedComments = JSON.parse(this.responseText)[1];
					postData = {"title":receivedData.title,"selftext":receivedData.selftext,"selftextHTML":receivedData.selftext_html,"url":receivedData.url,"score":receivedData.score,"user":receivedData.author,"flair":receivedData.link_flair_text,"comments":formatComments(receivedComments)}
					knownPostData[subreddit + "_" + post] = postData;
					loadthispostrighthere();
					if (tp) loadComments(subreddit + "_" + post);
 				}
 			}
 			xhttp.open("GET", "https://www.reddit.com/r/" + subreddit + "/comments/" + post + "/.json", true);
	  		xhttp.send();
		}
	} else {
		if (tp) changePageTo("page_" + subreddit + "_" + post,noHistory);
 		postGarbageCollector();
	}
	
		function loadthispostrighthere() {
			postPage = document.createElement("div");
			postPage.id = "page_" + subreddit + "_" + post;
			postPage.setAttribute("author",postData.user);
			postPage.setAttribute("postID","t3_" + post);
			postPage.setAttribute("sub",subreddit);
			postPage.setAttribute("class","ui-page");
			document.getElementById("everything").appendChild(postPage);

		next = document.createElement("img");
		next.setAttribute("src","/css/images/next.png");
		next.setAttribute("class","swipenext");
		next.setAttribute("style","left:360px");
		next.id = "swipenext";
		next.width = 360;
		next.height = 360;
		postPage.appendChild(next);

		prev = document.createElement("img");
		prev.setAttribute("src","/css/images/previous.png");
		prev.setAttribute("class","swipeprev");
		prev.setAttribute("style","left:-360px");
		prev.id = "swipeprev";
		prev.width = 360;
		prev.height = 360;
		postPage.appendChild(prev);
			 				
			var outerDiv = document.createElement("div");
			outerDiv.setAttribute("class","ui-scroller");
			outerDiv.setAttribute("tizen-circular-scrollbar","");
			outerDiv.id = "scrollable";
			postPage.appendChild(outerDiv);
				
			var title = document.createElement("div");
			title.setAttribute("class","ui-content content-padding");
			title.setAttribute("style","position:relative;overflow:visible;color:rgba(0,149,255,1);padding-bottom:0px");
			outerDiv.appendChild(title);	
			title.innerHTML = postData.title;

			if (postData.flair != "" && postData.flair != null && postData.flair != undefined) {	
				var flairSpan = document.createElement("span")
				flairSpan.setAttribute("style","color:rgb(147, 147, 147)");
				var flairLink = document.createElement("a");
				flairLink.setAttribute("href",'#');
				flairLink.setAttribute("onclick",`linkToSub("${encodeURI(`${subreddit}/search?q=flair_name%3A"${postData.flair}"&restrict_sr=1`)}")`);
				flairLink.setAttribute("style","color:rgb(147, 147, 147)");
				flairLink.innerHTML = `[${postData.flair}]`;
				flairSpan.appendChild(flairLink);
				title.innerHTML = title.innerHTML + "\n";
				title.appendChild(flairSpan);
			}
			
			var additionalInfo = document.createElement("div");
			additionalInfo.setAttribute("style","font-size:25px;position:absolute;margin-left:auto;margin-right:auto;left:0;right:0;transform:translateY(15px)");
			title.appendChild(additionalInfo);
			
			var user = document.createElement("a");
			user.setAttribute("style","color:rgb(147, 147, 147);display: inline-block;margin-right:5px");
			user.innerHTML = postData.user;
			user.setAttribute("href","#");
			user.setAttribute("onclick",`linkToSub("${postData.user}",true)`);
			additionalInfo.appendChild(user);
			
			var score = document.createElement("div");
			score.setAttribute("style","color:rgb(255,69,0);display: inline-block;margin-left:5px");
			if (postData.score > 0) score.setAttribute("style","color:rgb(255,69,0);display: inline-block;margin-left:5px");
			if (postData.score < 0)	score.setAttribute("style","color:rgb(147,145,255);display: inline-block;margin-left:5px");
			if (postData.score == 0) score.setAttribute("style","color:rgb(147,147,147);display: inline-block;margin-left:5px");
			if (postData.score > 0) score.innerHTML = postData.score + " ▲";
			if (postData.score < 0) score.innerHTML = postData.score + " ▼";
			if (postData.score == 0) score.innerHTML = 0;
			additionalInfo.appendChild(score);
				
			var content = document.createElement("div");
			content.setAttribute("class","ui-content content-padding post-content");
			outerDiv.appendChild(content);
				 			
			var btn = document.createElement("button");
			btn.setAttribute("class","ui-more");
			btn.setAttribute("onclick","onSubmissionPressMore(this)");
			btn.innerHTML = "Options";
			postPage.appendChild(btn);
		
		var canBeLoaded = true;
			if (postData.selftext!="") {
				content.innerHTML = decodeHTML(postData.selftextHTML);
				content.setAttribute("style","word-wrap:break-word");
			} else {
				content.innerHTML = "Loading post...";
				var isLoaded = false;
				var img = new Image();
				img.src = postData.url;
				img.setAttribute("width","300px");
				img.setAttribute("onclick",`viewImage("${img.src}")`);
				img.onerror = img.onabort = function() {
					isLoaded = true;
					if (postData.url.startsWith("https://www.reddit.com/")) {
						if (content.parentElement.getElementsByClassName("post-comments")[0]) content.parentElement.getElementsByClassName("post-comments")[0].setAttribute("style","position:absolute;top:0px");
					outerDiv.removeChild(content);
				} else {
					content.innerHTML = "Link: " + postData.url;
					content.setAttribute("style","font-size:25px;padding-left:30px;padding-right:30px;word-wrap:break-word");
				}
		  	};
		  	img.onload = function() {
		  		content.innerHTML = "";
		  		content.appendChild(img);
		  		isLoaded = true;
		  	}
		  	setTimeout(function(){
		  		if (!isLoaded && currentPage != ("page_" + subreddit + "_" + post)) {
		  			document.getElementById("page_" + subreddit + "_" + post).remove();
		  			if (loadedPosts.includes(subreddit + "_" + post)) loadedPosts.splice(loadedPosts.indexOf(subreddit + "_" + post),1);
		  			if (postsBeingLoaded.includes(subreddit + "_" + post)) postsBeingLoaded.splice(postsBeingLoaded.indexOf(subreddit + "_" + post),1);
		  			canBeLoaded = false;
		  		}
		  	}, autoPostLoadingTimeout * 1000);
			}
			if (canBeLoaded) {
 			loadedPosts.push(subreddit + "_" + post);
 			//knownData[subreddit + "_" + post] = postData;
 			postsBeingLoaded.splice(postsBeingLoaded.indexOf(subreddit + "_" + post),1);
 			if (tp) changePageTo("page_" + subreddit + "_" + post,noHistory);
 			postGarbageCollector();
			}
		}
}

function loadComments(post) {
	if (knownPostData[post].comments == "loading") {
		var thisSub = post.slice(0,-7);
		var thisPost = post.slice(-7).substr(1);
		var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				var receivedComments = JSON.parse(this.responseText)[1];
				knownPostData[thisSub + "_" + thisPost].comments = formatComments(receivedComments);
				setTimeout(function(){loadComments(thisSub + "_" + thisPost)}, 100);
				}
			}
			xhttp.open("GET", "https://www.reddit.com/r/" + thisSub + "/comments/" + thisPost + "/.json", true);
  		xhttp.send();
	} else {
		var comments = knownPostData[post].comments;
		if (document.getElementById("page_" + post)) {
			if (!document.getElementById("page_" + post).querySelector(".post-comments")) {
				var scroller = document.getElementById("page_" + post).getElementsByClassName("ui-content")[0].parentElement;
				var content = document.createElement("div");
	 			content.setAttribute("class","ui-content content-padding post-comments");
	 			if (scroller.getElementsByClassName("post-content")[0]) {
	 				content.setAttribute("style","position:relative;top:-150px");
	 			} else {
	 				content.setAttribute("style","position:relative;top:0px");
	 			}
	 			scroller.appendChild(content);
	 			
	 			content.innerHTML = "<hr>Comments<br>";
	 			
	 			var commentSection = document.createElement("li");
	 			commentSection.setAttribute("style","font-size:20px;margin-top:10px;overflow-y:visible;");
				content.append(commentSection);
				
				var oldlvl = 0;
				function createComment(base,level) {
					if (base.text != undefined) {
						var cmt = document.createElement("ul");
						cmt.setAttribute("onmousedown",`cmtWrapperDown("${base.id}","${post}",${base.collapseChildren})`);
						//cmt.setAttribute("onmouseup",`cmtWrapperUp("${base.id}","${post}")`);
						cmt.id = base.id
						cmt.setAttribute("style",`position:relative;background-color:#262626;word-wrap:break-word;margin-bottom:10px;border-radius:10px;padding:5px;padding-top:11px;margin-left:${level*15}px`);
						cmt.setAttribute("class","comment-wrapper");
						
						var additionalInfo = document.createElement("div");
			 			additionalInfo.setAttribute("style",`overflow:hidden;font-size:23px;margin-left:auto;margin-right:auto;margin-bottom:5px;`);
			 			cmt.appendChild(additionalInfo);
			 			
			 			var user = document.createElement("a");
			 			user.setAttribute("style","word-wrap:break-word;color:rgb(147, 147, 147);display: inline-block;margin-right:5px");
			 			user.innerHTML = base.author;
			 			user.setAttribute("href","#");
			 			user.setAttribute("onclick",`linkToSub("${base.author}",true)`);
			 			additionalInfo.appendChild(user);
			 			
			 			var score = document.createElement("div");
			 			if (base.score > 0) score.setAttribute("style","color:rgb(255,69,0);display: inline-block;margin-left:5px");
			 			if (base.score < 0)	score.setAttribute("style","color:rgb(147,145,255);display: inline-block;margin-left:5px");
			 			if (base.score == 0) score.setAttribute("style","color:rgb(147,147,147);display: inline-block;margin-left:5px");
			 			if (base.score > 0) score.innerHTML = base.score + " ▲";
			 			if (base.score < 0) score.innerHTML = base.score + " ▼";
			 			if (base.score == 0) score.innerHTML = 0;
			 			additionalInfo.appendChild(score);
			 			
			 			cmt.innerHTML = cmt.innerHTML + decodeHTML(base.text);
			 			
						commentSection.appendChild(cmt);
		
			 			for(var i = 0;i<level;i++) {
			 				var line = document.createElement("div");
			 				if (level>oldlvl && i==0) {
								line.setAttribute("style",`position:absolute;height:calc(100% - 20px);border-left: 2px solid #515151;left:${-1 * i * 15 - 10}px;top:10px`);
							} else {
								line.setAttribute("style",`position:absolute;height:calc(100% + 10px);border-left: 2px solid #515151;left:${-1 * i * 15 - 10}px;top:-20px`);
							}
			 				cmt.appendChild(line);
			 			}
						
						oldlvl = level;
						
						if (base.collapseChildren && base.children.length > 0) {
							var collapsed = document.createElement("ul");
							collapsedLink = document.createElement("a");
							if (base.children.length == 1) {
								collapsedLink.innerHTML = `Collapsed 1 response ▼`;
							} else {
								collapsedLink.innerHTML = `Collapsed ${base.children.length} responses ▼`;
							}
							collapsedLink.setAttribute("href","#");
							collapsedLink.setAttribute("onclick",`expandComments("${base.id}","${post}")`);
							collapsed.appendChild(collapsedLink);
							collapsed.setAttribute("class","comment-wrapper");
							collapsed.setAttribute("style",`position:relative;background-color:#262626;word-wrap:break-word;margin-bottom:10px;border-radius:10px;padding:5px;margin-left:${(level+1)*15}px`);
							commentSection.appendChild(collapsed);
							for(var i = 0;i<level+1;i++) {
				 				var line = document.createElement("div");
				 				if (level+1>oldlvl && i==0) {
									line.setAttribute("style",`position:absolute;height:calc(100% - 20px);border-left: 2px solid #515151;left:${-1 * i * 15 - 10}px;top:10px`);
								} else {
									line.setAttribute("style",`position:absolute;height:calc(100% + 10px);border-left: 2px solid #515151;left:${-1 * i * 15 - 10}px;top:-20px`);
								}
				 				collapsed.appendChild(line);
				 			}
						} else {
							base.children.forEach(function(comment){
								createComment(comment,level+1);
							});
						}
					}
				}
				
				comments.forEach(function(comment){
					createComment(comment,0);
				});
			}
		}
			if (postScrollTo!="") {
				toTravel = getOffset(document.getElementById(postScrollTo)).top - 50;
				document.getElementById(postScrollTo).setAttribute("style",document.getElementById(postScrollTo).getAttribute("style") + ";background-color:#3d3d3d");
			}
			postScrollTo = "";
		}
}

function expandComments(cmtId,post) {
	var comments = knownPostData[post].comments;
	if (comments) {
		knownPostData[post].comments = loopThroughComments(comments);
		reloadComments()
		function loopThroughComments(array) {
			for (var i = 0;i<array.length;i++) {
				if (array[i].id == cmtId) array[i].collapseChildren = false;
				array[i].children = loopThroughComments(array[i].children);
			}
			return array;
		}
		function reloadComments() {
			if (document.getElementById("page_" + post)) {
				if (document.getElementById("page_" + post).querySelector(".post-comments")) {
					document.getElementById("page_" + post).querySelector(".post-comments").remove();
				}
				loadComments(post);
			}
		}
	}
}

var cmtDowns = {};

function cmtWrapperDown(cmtId,post,areCollapsed) {
	var date = new Date();
	var dif = date.getTime() - cmtDowns[cmtId + "_" + post];
	cmtDowns[cmtId + "_" + post] = date.getTime();
	if (isNaN(dif)) dif = 1000;
	if (dif < 300) {
		if (areCollapsed) {
			expandComments(cmtId,post);
		} else {
			collapseComments(cmtId,post);
		}
	}
}

function cmtWrapperUp(cmtID,post) {}

function collapseComments(cmtId,post) {
	var comments = knownPostData[post].comments;
	if (comments) {
		knownPostData[post].comments = loopThroughComments(comments);
		reloadComments()
		function loopThroughComments(array) {
			for (var i = 0;i<array.length;i++) {
				if (array[i].id == cmtId) array[i].collapseChildren = true;
				array[i].children = loopThroughComments(array[i].children);
			}
			return array;
		}
		function reloadComments() {
			if (document.getElementById("page_" + post)) {
				if (document.getElementById("page_" + post).querySelector(".post-comments")) {
					document.getElementById("page_" + post).querySelector(".post-comments").remove();
				}
				loadComments(post);
			}
		}
	}
}

function viewImage(url) {
	if (loadedPosts.includes("img_" + url)) {
		changePageTo("img_" + url);
	} else {
		postPage = document.createElement("div");
			postPage.id = "img_" + url;
			postPage.setAttribute("class","ui-page");
			postPage.setAttribute("style","padding:0;margin:0;text-align:center;transition:all 0.5s ease-in");
			document.getElementById("everything").appendChild(postPage);
			
			var outerDiv = document.createElement("div");
			outerDiv.setAttribute("class","ui-scroller bezel-zoom");
			outerDiv.setAttribute("style","padding:0;margin:0;text-align:center;");
			postPage.appendChild(outerDiv);
			
			var content = document.createElement("div");
 		content.setAttribute("class","ui-content");
 		content.setAttribute("style","transition: all 0.1s ease-in;width:360px;padding:0;padding-top:75px;padding-bottom:75px;margin:0;text-align:center;");
 		outerDiv.appendChild(content);
 		
		content.innerHTML = "Loading image...";
		
		var img = new Image();
		img.src = url;
		img.setAttribute("width","300px");
		img.setAttribute("height","auto");
		img.id = "zoomable";
		//img.setAttribute("style","transition: all 0.1s ease-in");
		img.setAttribute("style","margin:0;");
		
		img.onerror = img.onabort = function() {
			content.innerHTML = "Link: " + postData.url;
			content.setAttribute("style","font-size:25px;padding:0;word-wrap:break-word");
	  	};
	  	
	  	img.onload = function() {
	  		content.innerHTML = "";
	  		content.appendChild(img);
	  		updateScroller();
	  	}
		
		loadedPosts.push("img_" + url);
		changePageTo("img_" + url);
		postGarbageCollector();
	}
}

function postGarbageCollector() {
	if (loadedPosts.length > maxLoadedPosts) {
		while (loadedPosts.length > maxLoadedPosts) {
			if (loadedPosts[0].startsWith("page")) {
				document.getElementById("page_" + loadedPosts[0]).remove();
			} else {
				document.getElementById(loadedPosts[0]).remove();
			}
			loadedPosts.splice(0,1);
		}
	}
}

function destroySel() {
	clearInterval(updateTextFunc);
	sel.destroy();
	tau.widget.SnapListview(document.querySelector(".ui-page-active").querySelector(".ui-snap-listview"));
	setTimeout(function(){
		tauCircleReset()
		updateScroller();
		var postsOptions = document.getElementById("postsOptions");
		if(postsOptions) {
			var overlay = postsOptions.parentElement.getElementsByClassName("ui-popup-overlay")[0];
			if (overlay) overlay.remove();
			postsOptions.remove();
		}
	}, 500);
}

/* IN-POST SWIPE DETECTION */

document.addEventListener('touchstart', handleTouchStart, false);        
document.addEventListener('touchmove', handleTouchMove, false);
document.addEventListener('touchend', handleTouchEnd, false);

var xDown = null;                                                        
var yDown = null;
var xDiff = 0;
var yDiff = 0;
var swipeNext = null;
var swipePrev = null;
var derivesFromList = false;
var lastList = null;
var openPage = null;
var searchResultsPage = 0;

function getTouches(evt) {
  return evt.touches ||             // browser API
         evt.originalEvent.touches; // jQuery
}                                                     

function handleTouchStart(evt) {
    const firstTouch = getTouches(evt)[0];                                      
    xDown = firstTouch.clientX;                                      
    yDown = firstTouch.clientY;                                      
};                                                

function handleTouchMove(evt) {
	checkIfLast()

    if ( ! xDown || ! yDown ) {
        return;
    }

    var xUp = evt.touches[0].clientX;                                    
    var yUp = evt.touches[0].clientY;

    xDiff = xDown - xUp;
    yDiff = yDown - yUp;

    if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {/*most significant*/
        openPage = document.getElementById(currentPage);
        lastList = document.getElementById(pageHistory[pageHistory.length-1]);
        if (lastList==null) {
        	derivesFromList = false;
        } else {
        	derivesFromList = loadedSubs.includes(lastList.id.substr(5));
       	}
       	searchResultsPage = 0;
       	if (currentPage.startsWith("result_")) searchResultsPage = 1;
       	if (currentPage.startsWith("postsresult_")) searchResultsPage = 2;
        if (!derivesFromList) lastList = null;
        if (openPage) {
        	swipeNext = openPage.querySelector("#swipenext");
        	swipePrev = openPage.querySelector("#swipeprev");
        	if (swipeNext) {
        		if (derivesFromList) {
        			swipePrev.setAttribute("style",`left:${-360 - xDiff}px`);
        			swipeNext.setAttribute("style",`left:${360 - xDiff}px`);
        		} else {
        			swipePrev.setAttribute("style",`left:-360px`);
        			swipeNext.setAttribute("style",`left:360px`);
        		}
        	}
        }          
    }                                      
};

function handleTouchEnd(evt) {
	var changePage = 0;
	if (derivesFromList) {
		if (xDiff < -200) {
			changePage = -1;
		}
		if (xDiff > 200) {
			changePage = 1;
		}

		if (lastList) var possiblePages = lastList.querySelectorAll(".ui-snap-listview-item");
		if (openPage && lastList) var postID = openPage.getAttribute("postID");
		var goToIndex = -1;
		if (postID) goToIndex = parseInt(lastList.querySelector(`#LIpostID_${postID}`).getAttribute("inOrder"),10) + changePage;
	}
	if (Math.abs(xDiff) < 200 || changePage == 0 || goToIndex < 0) {
		if (swipePrev) swipePrev.setAttribute("style",`left:-360px`);
        if (swipeNext) swipeNext.setAttribute("style",`left:360px`);
	}
	xDown = null;                                      
    yDown = null;
    if (searchResultsPage == 0) {
		if (derivesFromList && goToIndex >= 0) {
			if (xDiff < -200) {
				swipePrev.setAttribute("style",`left:0px`);
	        	swipeNext.setAttribute("style",`left:720px`);
			}
			if (xDiff > 200) {
				swipePrev.setAttribute("style",`left:-720px`);
	        	swipeNext.setAttribute("style",`left:0px`);
			}
			if (changePage!=0) {
		    	setTimeout(function(){
		    		if (goToIndex >= possiblePages.length) {
						var sub = lastList.getAttribute("sub");
						var args = lastList.getAttribute("args");
						var urlSearch = lastList.getAttribute("urlSearch");
						if (args != "") args = "?" + args.substr(1);
				  		var userPrefix = (lastList.querySelector("#postslist_" + sub).getAttribute("prefix")=="r/") ? "" : "$USER$_";
				  		if (lastList.querySelector("#postslist_" + sub).getAttribute("prefix")=="") userPrefix = "";
				  		changePageTo("loading",false);
					    loadPosts("$TOFIRST$_" + userPrefix + sub + urlSearch + args,lastList.querySelector("#postslist_" + sub).getAttribute("lastloaded"));
					    if (lastList.querySelector(".lastInList")) lastList.querySelector(".lastInList").setAttribute("class","ui-snap-listview-item ui-snap-listview-selecter");
					    swipePrev.setAttribute("style",`left:-360px`);
	        			swipeNext.setAttribute("style",`left:360px`);
		    		} else {
			    		if(lastList) {
			    			var goToButton = lastList.querySelectorAll(".ui-snap-listview-item")[goToIndex];
				    		var goToPost = goToButton.getAttribute("post");
				    		var goToSub = goToButton.getAttribute("sub");
				    		changePageTo("loading",false);
				    		showPost(goToSub,goToPost.substr(3),true);
			    		}
			    		swipePrev.setAttribute("style",`left:-360px`);
	        			swipeNext.setAttribute("style",`left:360px`);
		    		}
				},500); 
			}
	    }     
	} else {
		if (searchResultsPage == 1) {
			if (xDiff > 100) {
				changePageTo(`posts${currentPage}`,false);
			}
		} else {
			if (xDiff < 100) {
				changePageTo(currenPage.substr(5),false);
			}
		}
	}
};  

/* POPUPS+ */

function createConfirmPopup(text) {
	var currentPageWrapper = document.getElementById(currentPage);
	
	var popup = document.createElement("div");
	popup.id = "confirmPopup";
	popup.setAttribute("class","ui-popup ui-popup-toast ui-popup-toast-graphic");
	currentPageWrapper.appendChild(popup);
	
	var popupContent = document.createElement("div");
	popupContent.setAttribute("class","ui-popup-content");
	popup.appendChild(popupContent)
	popupContent.innerHTML = popup.innerHTML + text;
	
	var popupIcon = document.createElement("div");
	popupIcon.setAttribute("class","ui-popup-toast-icon ui-popup-toast-check-icon btn-icon-toast-check");
	popupContent.appendChild(popupIcon);
	
	tau.openPopup(popup);
		setTimeout(function(){
		tau.closePopup();
		setTimeout(function(){
			popup.remove();
			tauCircleReset();
		}, 500);
	}, 1500);

}

/* PAGE HANDLER */

var pageHistory = [];

tau.defaults.pageTransition = "slideup"

// tau native:

//I FUCKING HATE SAMSUNG FOR CREATING THIS SHITTY OS AND THIS SHITTY FRAMEWORK

/* 
function changePageTo(pageID,addToHistory=true) {
	if (document.getElementById(currentPage)) {if (document.getElementById(currentPage).getElementsByClassName("post-comments")[0]) {document.getElementById(currentPage).getElementsByClassName("post-comments")[0].remove();}}
	if (currentPage != "loading" && addToHistory) pageHistory.push(currentPage);

	var newPage = document.getElementById(pageID);
	var oldPage = document.getElementById(currentPage);	

	currentPage = pageID;

	newPage.classList.add('ui-scroll-on');
	tau.changePage(pageID);

	if (!newPage.getElementsByClassName("post-comments")[0] && loadedPosts.includes(pageID.substr(5)) && pageID.substr(5) in knownPostData) loadComments(pageID.substr(5));

	setTimeout(function(){
		oldPage.classList.remove('ui-scroll-on');
		setTimeout(function(){
			tauCircleReset();
			updateScroller();
		},100);
	},400);
}
*/

// own:


function changePageTo(pageID,addToHistory=true) {
	//shadeElement.classList.add("active");
	//shadeElement.offsetHeight;

	//setTimeout(function(){
		if (document.getElementById(currentPage)) {if (document.getElementById(currentPage).getElementsByClassName("post-comments")[0]) {document.getElementById(currentPage).getElementsByClassName("post-comments")[0].remove();}}
		if (currentPage != "loading" && addToHistory) pageHistory.push(currentPage);
		var newPage = document.getElementById(pageID);
		var oldPage = document.getElementById(currentPage);
		currentPage = pageID;

		if (oldPage) oldPage.setAttribute("class",'ui-page');
		newPage.setAttribute("class",'ui-page ui-page-active ui-scroll-on');
		if (!newPage.getElementsByClassName("post-comments")[0] && loadedPosts.includes(pageID.substr(5)) && pageID.substr(5) in knownPostData) loadComments(pageID.substr(5));
		tauCircleReset();
		updateScroller();

		//shadeElement.classList.remove("active");
	//},250);
}


var oldNSFW = nsfw;

window.addEventListener('tizenhwkey', function(ev) {
	if (document.querySelector(".ui-popup-active")) {
		tau.closePopup();
		if (document.getElementById("postsOptions")) {
			destroySel();
			if (nsfw != oldNSFW) {
				oldNSFW = nsfw;
				if (loadedSubs.includes(currentPage.substr(5))) {
					var subgoto = currentPage;
					var wrapper = document.getElementById(subogoto);	
					var sub = wrapper.getAttribute("sub");
					var args = wrapper.getAttribute("args");
					var urlSearch = wrapper.getAttribute("urlSearch");
					if (args != "") args = "?" + args.substr(1);
					changePageTo("loading",false);
					setTimeout(function(){
						document.getElementById(subgoto).remove();
						loadPosts(sub + urlSearch + args);
					},100);
				}
			}
		}			
	} else {
		if (ev.keyName === "back") {
			if (pageHistory.length > 0) {	
				changePageTo(pageHistory.pop(),false);
			}
		}
	}
});

function backToHome() {
	if (document.getElementById(currentPage)) document.getElementById(currentPage).setAttribute("class","ui-page");
	document.getElementById("main").setAttribute("class","ui-page ui-page-active ui-scroll-on");
	currentPage = "main";
	pageHistory = [];
	tauCircleReset();
	updateScroller();
}

/* CONTENT SCROLLING */

var scrollingInterval = null

function startScrollingInterval () {
	scrollingInterval = setInterval(function(){
       	if (elScroller) {
       		offset = elScroller.scrollTop;
            if(toTravel != 0 || traveled != 0) {
	       		if (offset<0) {
	       			toTravel = 0;
	       			traveled = 0;	
	       			clearInterval(scrollingInterval);
	       			scrollingInterval = null;
	       		}
	       		
	       		change = (traveled - toTravel) * -.1;
	       	
	       		traveled += change;
	       		offset += change;
	       		
	       		if(Math.round(traveled/10)*10==Math.round(toTravel/10)*10)
	       		{
	       			toTravel = 0;
	       			traveled = 0;
	       			clearInterval(scrollingInterval);
	       			scrollingInterval = null;
	       		}
	       		elScroller.scrollTop = offset;
	       		elScroller.scrollLeft = 0;	
	       	} else {
	       		offset = elScroller.scrollTop;
	       	}

	       	//elScroller.setAttribute("style",`position:relative;top:${toTravel}px`);

        } else {
        	toTravel = 0;
        	scrollMomentum = 0;
        	traveled = 0;
        	offset = 0;
        	clearInterval(scrollingInterval);
        	scrollingInterval = null;
        }
	 }, 15);
 }
 
var zoomableImg = null;

function updateScroller() {
	scrollingPage = document.getElementById("everything").querySelector(".ui-page-active")
   	if (scrollingPage) {
   	
   		//var wasNull = (elScroller == null);
   		elScroller = scrollingPage.querySelector("#scrollable");
   		if (scrollingInterval == null) startScrollingInterval();
   		//if (wasNull && elScroller) startScrollingInterval();
   		
		zoomableImg = scrollingPage.querySelector("#zoomable");
		if (zoomableImg) {
			totalZoom = parseInt(zoomableImg.getAttribute("width"),10) - 300;
			oldZoom = totalZoom;
		}
    } else {
    	elScroller = null;
    	zoomableImg = null;
    }  
}

(function() {
    var SCROLL_STEP = 100;
    var ZOOM_STEP = 50;
    document.addEventListener("pagebeforeshow", function pageScrollHandler(e) {
        rotaryEventHandler = function(e) {
        	checkIfLast()
            if (elScroller) {
                if (e.detail.direction === "CW") {
                	toTravel += SCROLL_STEP;
                	if (scrollingInterval == null) startScrollingInterval();
                } else if (e.detail.direction === "CCW") {
                    toTravel -= SCROLL_STEP;
                    if (scrollingInterval == null) startScrollingInterval();
                }
            }
            if (zoomableImg) {
            	if (e.detail.direction === "CW") {
                	totalZoom += ZOOM_STEP;
                } else if (e.detail.direction === "CCW") {
                    totalZoom -= ZOOM_STEP;
                }
                if (totalZoom < 0) totalZoom = 0;
                if (totalZoom > maxZoom) totalZoom = maxZoom;
                var fromLeft = Math.max((totalZoom + 300 - winWidth),0) / 2 + (totalZoom + 300) * ((zoomableImg.parentElement.scrollLeft - Math.max((oldZoom + 300 - winWidth) / 2,0)) / (oldZoom + 300));
                var fromTop = totalZoom * (zoomableImg.parentElement.parentElement.scrollTop / oldZoom);
                //console.log(zoomableImg.parentElement.parentElement.scrollTop);
                //console.log(getHeight(zoomableImg));
                zoomableImg.parentElement.scrollLeft = fromLeft;
                zoomableImg.parentElement.fromTop = fromTop;
                //zoomableImg.setAttribute("style",`transform:translateX(${fromLeft * -1}px)`);
				zoomableImg.setAttribute("width",300 + totalZoom + "px");
				//zoomableImg.setAttribute("style",`transition: all 0.1s ease-in`);
                oldZoom = totalZoom;
            }
        };

        document.addEventListener("rotarydetent", rotaryEventHandler, false);
    }, false);
}());

function getHeight(obj) {
	var divHeight;
	
	if(obj.offsetHeight) {
	    divHeight=obj.offsetHeight;
	
	} else if(obj.style.pixelHeight) {
	    divHeight=obj.style.pixelHeight;
	
	}
	return(divHeight);
}

/* LIST SCROLLING */

var page,
list,
listHelper = [],
i, len;

tauCircleStart();

function tauCircleStart () {
	if (tau.support.shape.circle) {

		document.addEventListener("pagebeforeshow", function (e) {
			page = e.target;
			list = page.querySelectorAll(".ui-listview:not(.select-mode-btn-list)");
			if (list) {
				/**
				 * Some pages don't use snap list.
				 */
				if (page.id !== "pageMarqueeList" && page.id !== "pageTestVirtualList" && page.id !== "pageAnimation") {
					len = list.length;
					for (i = 0; i < len; i++) {
						//listHelper[i] = tau.helper.SnapListStyle.create(list[i]);
						listHelper[i] = tau.helper.SnapListStyle.create(list[i], {animate: "scale"});
					}
				}
			}
		});
		
		document.addEventListener("pagebeforehide", function () {
			len = listHelper.length;
			if (len) {
				for (i = 0; i < len; i++) {
					listHelper[i].destroy();
				}
				listHelper = [];
			}
		});
	}
}

function tauCircleReset () {
	page = document.getElementsByClassName("ui-page-active")[0];
	if (page) {list = page.querySelectorAll(".ui-listview:not(.select-mode-btn-list)");
		len = listHelper.length;
			if (len) {
				for (i = 0; i < len; i++) {
					listHelper[i].destroy();
				}
			listHelper = [];
		}
		if (list) {
			if (page.id !== "pageMarqueeList" && page.id !== "pageTestVirtualList" && page.id !== "pageAnimation") {
				len = list.length;
				for (i = 0; i < len; i++) {
					//listHelper[i] = tau.helper.SnapListStyle.create(list[i]);
					listHelper[i] = tau.helper.SnapListStyle.create(list[i], {animate: "scale"});
				}
			}
		}
	}
}