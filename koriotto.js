// JavaScript Document
Drupal.behaviors.koriotto = {
  attach: function (context, settings) {
	  if (Drupal.settings.koriotto.section_data) {
		sections = JSON.parse(Drupal.settings.koriotto.section_data);  
	  }
	jQuery("audio#song").change(function (e) {
		var file = e.currentTarget.files[0];
		var objectUrl = URL.createObjectURL(file);
		jQuery("#song").prop('src', objectUrl);
	}).bind("canplaythrough", function(e) {
		jQuery("#controls").show();
		  refreshDisplay();
	}).bind("play", function(e) {
		progressTimer = setInterval(function() {
			updateProgressBars();
		}, 10);
	}).bind("pause", function(e) {
		clearInterval(progressTimer);
	});
	jQuery("#edit-koriotto-controls-play-btn").bind("click", function(e) {
		jQuery("#song").get(0).play();
	});
	jQuery("#section_play").bind("click", function(e) {
		// when this one is clicked we want the screen to keep up with the music
		jQuery("#song").bind("timeupdate", syncChoreography);
		jQuery("#song").get(0).play();
	});
	jQuery("#edit-koriotto-controls-pause-btn, #section_pause").bind("click", function(e) {
		jQuery("#song").unbind("timeupdate");
		jQuery("#song").get(0).pause();
	});
	jQuery("#edit-koriotto-controls-rewind-btn").bind("click", function(e) {
		jQuery("#song").get(0).currentTime=0;
		updateProgressBars();
	});
	jQuery("#section_rewind").bind("click", function(e) {
		seekSection(editingSection);
	});
	jQuery("#edit-koriotto-controls-section-btn").bind("click", addSectionBreak);
	jQuery("#edit-koriotto-section-props-apply-btn").bind("click", applySectionTempo);
	jQuery("#sections_fill > div").bind("click", function(e) {
		editSection(jQuery(e.currentTarget).index());
	});
	jQuery("#bpm_measure").bind("click", startBPM);
	jQuery("#section_data :not('input')").bind("dblclick", "span.edit", editSectionAttribute);
	jQuery("#section_choreography").bind("dblclick", "td, th", function(e) {
		editChoreography(e.currentTarget);
	});
	jQuery("#section_data").bind("focusout", "input", function(e) {
		var cellID;
		if (cellID = jQuery(e.currentTarget).parent().attr('id')) {
			var attr = (cellID.substr(8));
			saveSectionAttribute(attr, e.currentTarget);
		}
	});
	jQuery("#section_measures").bind("click", ".beatMark", function(e) {
		clickMeasure(e.currentTarget);
	});
	jQuery("#edit-koriotto-section-props-delete-btn").bind("click", deleteSection);
	jQuery("#add_part").bind("click", addPart);
//	jQuery("#json_export").bind("click", json_export);
	jQuery("#json_import").bind("click", json_import);
	jQuery("#practice_mode").bind("click", practiceMode);
	jQuery(".collapser").bind("click", function(e) {
		jQuery(e.currentTarget).siblings().toggle();
	});
  }
}

var lastSection = 0;
var sectionCount = 0;
var sections = [];
var editingSection;
var bpmStatus = false;
var bpmStart = 0;
var bpmLast = 0;
var bpmBeats = 0;
var beatAvgBPM;
var progressTimer;

function minSec(rawsec) {
	var min = Math.floor(rawsec / 60);
	var sec = Math.floor((rawsec % 60) * 100)/100;
	if (sec % 1 == 0) {
		sec += '.0';
	}
	if ((sec * 10) % 1 == 0) {
		sec += '0';
	}
	if (sec < 10) {
		sec = '0' + sec;
	}
	return min + ':' + sec;
}

function rawSec(minSec) {
	if (!isNaN(parseFloat(minSec))) {
		return parseFloat(minSec);
	}
	var cut = minSec.split(':');
	if (cut[0].match(/\d+/) && cut[1].match(/[\d\.]+/)) {
		var seconds = parseInt(cut[0]) * 60 + parseFloat(cut[1]);
		return seconds;
	} else {
		return false;
	}
}

function addSectionBreak(e) {
	var marker = jQuery("#song").get(0).currentTime;
	var lastMarker = lastSection;
	var newSection = {
		end: marker,
//		length: marker - lastSection,
		name: 'Section ' + (sections.length + 1),
		timesig: 0,
		beats: 1,
		bpm: null,
		choreography: null,
		parts: null,
	};
	sections.push(newSection);
	lastSection = marker;
	var mySection = document.createElement("div");
	var sectionSize = ((marker-lastMarker)/jQuery("#song").get(0).duration)*100;
	jQuery(mySection).attr('id', 'section'+sectionCount).css('width', sectionSize + '%').css('left', (100 * lastMarker) / jQuery("#song").get(0).duration + '%').addClass("koriotto_musicbar koriotto_section");
	jQuery(mySection).bind("click", function(e) {
		editSection(jQuery(e.currentTarget).index());
	});

	jQuery("#sections_fill").append(mySection);
	sectionCount++;	
	updateSectionData();	
}

function editSection(sec) {
	editingSection = sec;
	console.log(sections[editingSection]);
	refreshDisplay();
	jQuery("#section_data").show();
	jQuery("#sections_fill div").removeClass("koriotto_action");
	jQuery("#sections_fill div:eq("+sec+")").addClass("koriotto_action");
	jQuery("#edit-koriotto-section-props-bpm").val(sections[sec].bpm);
	jQuery("#edit-koriotto-section-props-timesig").val(sections[sec].timesig);
	jQuery("#edit-koriotto-section-props-start").val(getStart(sec));
	jQuery("#edit-koriotto-section-props-finish").val(sections[sec].end);
}

function applySectionTempo(e) {
	sections[editingSection].bpm = parseInt(jQuery("#edit-koriotto-section-props-bpm").val());
	sections[editingSection].timesig = parseInt(jQuery("#edit-koriotto-section-props-timesig").val());
	sections[editingSection].finish = parseInt(jQuery("#edit-koriotto-section-props-finish").val());
	if (editingSection > 0) {
		sections[editingSection-1].finish = parseInt(jQuery("#edit-koriotto-section-props-start").val());
	}
	displayBPM(sections[editingSection].bpm);
	updateSectionData();
	refreshDisplay();
}

function updateSectionData() {
	jQuery("#edit-field-section-data textarea").val(JSON.stringify(sections));
}

function getStart(sec) {
	if (sec == 0) {
		return 0;
	}
	return (sections[sec-1].end);
}

function seekSection(sec) {
	jQuery("#song").get(0).currentTime = getStart(sec);
}

function trimToBeat() {
}

function startBPM(e) {
	if (bpmStatus) {
		jQuery(e.currentTarget).text('Measure');
		window.removeEventListener("keyup", recordBeat);
		sections[editingSection].bpm = Math.round(beatAvgBPM);
		jQuery("#section_bpm").text(sections[editingSection].bpm);
		var spb = 60 / sections[editingSection].bpm;
		var lastBeat = spb * Math.round((sections[editingSection].end - getStart(editingSection)) / spb);
		changeStartTime(editingSection+1, getStart(editingSection) + lastBeat);
		bpmLast = 0;
		refreshDisplay();		
	} else {
		window.addEventListener("keyup", recordBeat, false);
		jQuery(e.currentTarget).text('Measuring...');
		jQuery("button").blur();
		displayBPM(0);
	}
	bpmStatus = !bpmStatus;
}

function recordBeat(e) {
	var beatLength, beatAvgNS, beatTime = new Date();
	if (bpmLast > 0) {
		var beatLength = beatTime - bpmLast;
		bpmBeats++;
		// nanoseconds per beat
		beatAvgNS = (beatTime - bpmStart) / bpmBeats;
		beatAvgBPM = 60 / (beatAvgNS / 1000); 
	} else {
		bpmStart = beatTime;
	}
	bpmLast = beatTime;
}

function editSectionAttribute(e) {
	var tgt = e.currentTarget;
	var oldVal = jQuery(tgt).html();
	jQuery(tgt).html("<input name='editing'></input>");
	jQuery(tgt).find("input").focus();
	window.addEventListener("keyup", checkEnter, false);
}

function checkEnter(e) {
	if (e.keyCode == 13) {
		jQuery("input").blur();
		window.removeEventListener("keyup");
	}
}

function saveSectionAttribute(attr, inputbox) {
	var showVal, newVal = jQuery(inputbox).parent().hasClass("numOnly") ? parseInt(jQuery(inputbox).val()) : jQuery(inputbox).val();
	if (jQuery(inputbox).parent().hasClass('time')) {
		if (jQuery(inputbox).parent().attr('id').substr(-5) == 'start') {
			showVal = changeStartTime(editingSection, newVal);
		} else {
			showVal = changeStartTime(editingSection+1, newVal);
		}
		jQuery(inputbox).parent().html(showVal);
	} else if (sections[editingSection] && sections[editingSection].hasOwnProperty(attr)) {
		sections[editingSection][attr] = newVal;
		jQuery(inputbox).parent().html(newVal);
	}
	refreshDisplay();
}

function updateProgressBars() {
	var song = jQuery("#song")[0];
	var songTime = song.currentTime;
	var totalTime = song.duration;
	var elapsedPct = (songTime / totalTime) * 100;
	jQuery("#song_progress_fill").css('width', elapsedPct+'%');
	jQuery("#song_playhead").css('width', elapsedPct+'%');
	if (sections[editingSection] != null && getStart(editingSection) < songTime && songTime < sections[editingSection].end) {
		// playhead in the section being edited
		var sectionElapsedPct = ((songTime - getStart(editingSection)) / (sections[editingSection].end - getStart(editingSection))) * 100;
		jQuery("#section_progress_fill").css('width', sectionElapsedPct + '%');
	} else {
		jQuery("#section_progress_fill").css('width', 0);
	}
	jQuery("#counter #elapsed").text(minSec(songTime));
	jQuery("#counter #total").text(minSec(totalTime));
}
function displayBPM(bpm) {
	jQuery("#section_measures div.beatMark").remove();
	clearChoreography();
	if (bpm > 0) {
		var spb = 60 / bpm;
		var measureWidth = 100 * spb / (sections[editingSection].end - getStart(editingSection));
		var sectionBeats = Math.floor(100 / measureWidth);
		sections[editingSection].beats = sectionBeats;
		for (var i=0;i<sectionBeats;i++) {
			var beatMark = document.createElement("div");
			jQuery(beatMark).addClass("koriotto_musicbar koriotto_beatMark").css({'width': measureWidth + '%', 'left': (measureWidth * i) + '%'});
			jQuery("#section_measures").append(beatMark);
		}
		if (sections[editingSection].timesig > 0) {
			jQuery("#section_measures div:nth-child("+sections[editingSection].timesig+"n+1)").css('border-left', 'double 3px #fff');
			loadChoreography(editingSection);
		}
	}
}

function newChoreography(s) {
	sections[s].parts = ['Lyrics'];
	sections[s].choreography = [];
	for (var i=0;i<Math.ceil(sections[s].beats / sections[s].timesig);i++) {
		sections[s].choreography[i] = ['&nbsp'];
	}
}

function clearChoreography() {
		jQuery("#section_choreography").html('');
}

function loadChoreography(s) {
	if (!sections[s].choreography) {
		newChoreography(s);
	}
	clearChoreography();
	// generate table from choreography data
	var headerRow = document.createElement("tr");
	for (var i=0;i<sections[s].parts.length;i++) {
		jQuery(headerRow).append("<th>"+sections[s].parts[i]+"</th>");
	}
	jQuery("#section_choreography").append(headerRow);
	for (var i=0;i<sections[s].choreography.length;i++) {
		var choreoRow = document.createElement("tr");
		for (var j=0;j<sections[s].parts.length;j++) {
			if (choreoCell = sections[s].choreography[i][j]) {
				jQuery(choreoRow).append("<td>"+choreoCell+"</td>");
			} else {
				jQuery(choreoRow).append("<td></td>");
			}
		}
		jQuery("#section_choreography").append(choreoRow);
	}
}

function refreshDisplay() {
	jQuery("#section_measures div").remove();
	jQuery("#sections_fill div").remove();
	var songLength = jQuery("#song").get(0).duration;
	for (var s=0;s<sections.length;s++) {
		var mySection = document.createElement("div");
		var sectionSize = ((sections[s].end - getStart(s))/songLength)*100;
		var styles = {"width": sectionSize + '%', "left": (100 * getStart(s)) / jQuery("#song").get(0).duration + '%'};
		jQuery(mySection).attr('id', 'section'+s).attr('title', sections[s].name).css( styles ).addClass("koriotto_musicbar koriotto_section").bind("click", function(e) {
		editSection(jQuery(e.currentTarget).index());
	});
		jQuery("#sections_fill").append(mySection);
	}
	if (sections[editingSection]) {
		displayBPM(sections[editingSection].bpm);
	}
	updateSectionData();
}

function changeStartTime(section, newTime) {
	if (section == 0) {
		return;
	}
	if (rawsec = rawSec(newTime)) {
		sections[section-1].end = rawsec;

		var spb = 60 / sections[editingSection].bpm;
		var lastBeat = spb * Math.round((sections[editingSection].end - getStart(editingSection)) / spb);
		sections[section].end = getStart(section) + lastBeat;
		if (section > 0) {
			sections[section-1].end = rawsec;
		} else {
			var newSection = {
				start: 0,
				end: rawsec,
				//length: rawsec,
				name: 'Shim Section 0',
				timesig: 0,
				bpm: null,
				choreography: null,
				beats: 1,
			};
			sections.unshift(newSection);
			editSection(section+1);
		}
		refreshDisplay();
		return minSec(rawsec);
	}
}

function clickMeasure(beatDiv) {
	if (sections[editingSection].timesig > 0) {
		var beatNum = jQuery(beatDiv).index();
		var measureNum = Math.floor(beatNum / sections[editingSection].timesig);
		highlightMeasure(measureNum);
		jQuery("#song").get(0).currentTime = getStart(editingSection) + (measureNum * sections[editingSection].timesig * 60 / sections[editingSection].bpm);
	}
}

function highlightMeasure(measureNum) {
	var firstBeat = measureNum * sections[editingSection].timesig;
	jQuery("#section_measures div").removeClass("highlight");
	for (var i=firstBeat;i<firstBeat+sections[editingSection].timesig;i++) {
		jQuery("#section_measures div:eq("+i+")").addClass("highlight");
	}
	// highlight the row in the lyrics table
	jQuery("#section_choreography tr").removeClass("action");
	jQuery("#section_choreography tr:eq("+(measureNum+1)+")").addClass("action");
}

function editChoreography(cell) {
	if (jQuery(cell).find("input").length > 0) {
		var oldContents = jQuery(cell).find("input:first-child").val();
	} else {
		var oldContents = jQuery(cell).text();
	}
	jQuery(cell).html("<input id='choreoEdit' class='choreoEdit'></input>");
	jQuery("#choreoEdit").val(oldContents);
	window.addEventListener("keyup", checkEnter, false);
	jQuery("#choreoEdit").focus().bind("focusout", function(e) {
		var tgt = e.currentTarget;
		var newVal = jQuery(tgt).val();
		var part = jQuery(tgt).parent().index();
		if (jQuery(tgt).parent().parent().index() == 0) {
			for (var i=0;i<sections.length;i++) {
				if (!sections[i].hasOwnProperty('parts')) {
					sections[i].parts = [];
				}
				sections[i].parts[part] = newVal;
			}
		} else {
			var measure = jQuery(tgt).parent().parent().index()-1;
			sections[editingSection].choreography[measure][part] = newVal;
		}
		jQuery(tgt).parent().text(newVal);
	});
}

function save_changes() {
	var myJSON = JSON.stringify(sections);
	jQuery.ajax('koriotto_saver.php', {
	data: {
		'filename' : choreographyFile,
		'newData' : myJSON,
	},
	type: 'POST'
	}).done(function(data) {
		if (data) {
			alert("Saved");
		}
	});
}

function json_import() {
	var myJSON = (jQuery("#json_data").val());
	var testSections = JSON.parse(myJSON);
	if (testSections) {
		importChoreography(testSections);
	}
}

function importChoreography(inSections) {
	sections = [];
	for (var i=0;i<inSections.length;i++) {
		sections[i] = inSections[i];
		var timedMeasures = Math.ceil(Math.round((inSections[i].end - inSections[i-1].end) / (60 / inSections[i].bpm)) / inSections[i].timesig);
		while (sections[i].choreography.length<timedMeasures) {
			var addMeas = new Array();
			for (var j=0;j<sections[i].parts.length;j++) {
				addMeas.push("&nbsp;");
			}
			sections[i].choreography.push(addMeas);
		}
		//console.log(i,timedMeasures);
	}
	jQuery("#json_data").val("");
	refreshDisplay();
}

function addPart() {
	jQuery("#section_choreography tr").each(function(index, element) {
		if (index == 0) {
			jQuery(this).append("<th>Part</th>");
		} else {
			jQuery(this).append("<td>&nbsp;</td>");
		}
	});
}

function deleteSection() {
	if (confirm('Delete this section and merge it with the previous?')) {
		sections[editingSection-1].end = sections[editingSection].end;
		sections.splice(editingSection, 1);
		editingSection--;
		refreshDisplay();
	}
}

function syncChoreography(e) {
	var syncPos = e.currentTarget.currentTime;
	// find section
	if (getStart(editingSection) > syncPos || sections[editingSection].end < syncPos) {
		var syncSection = 0;
		while(getStart(syncSection) > syncPos || sections[syncSection].end < syncPos) {
			syncSection++;
		}
		console.log('re-sync');
		editSection(syncSection);
	}
	var secPerMeasure = (60 / sections[editingSection].bpm) * sections[editingSection].timesig;
	var measureNum = Math.floor((syncPos - sections[editingSection-1].end) / secPerMeasure);
	highlightMeasure(measureNum);
}

function practiceMode(e) {
	jQuery(".editMode").toggle();
}