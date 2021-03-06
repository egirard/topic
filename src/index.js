'use strict';
import * as lobby from './lobby.js';

document.addEventListener('DOMContentLoaded', init);

let client;
let room;
const TOPIC_ROOM = '!zIlIGXfNAskJbYZvgO:matrix.org';
const MATRIX_USERNAME = 'topic-bot';
const MATRIX_PASSWORD = 'riot.IM.PASSWORD';
let user_id;
let is_admin;

function $(query) {
  return document.querySelector(query);
}

function getUrlVars() {
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
    vars[key] = value;
  });
  return vars;
}

async function init() {
  user_id = localStorage.getItem('user_id');
  if (!user_id) {
    user_id = 'user' + Math.floor(Math.random() * 1000000);
    localStorage.setItem('user_id', user_id);
  }
  console.log(user_id);

  is_admin = getUrlVars()["admin"];
  console.log( is_admin);

  initUI();
  let service = await lobby.createService();
  if (!(client = await service.reauthenticate())) {
    client = await service.login(MATRIX_USERNAME, MATRIX_PASSWORD);
  }
  room = await client.join(TOPIC_ROOM);
  handleUpdates(room);
}

function cloneTemplate(templateClass) {
  return $('#templates .' + templateClass).cloneNode(true);
}

async function handleUpdates(room) {
  while (true) {
    let events = await room.fetchEvents();
    for (let evt of events) {
      console.log(evt);
      if (evt.content.newlyAddedTopic) {
          if (evt.content.user_id = user_id) {
            // TODO: vote for pedro
          }
          let elem = cloneTemplate('topic');
          let topic = evt.content.newlyAddedTopic;
          elem.topic = topic;
          elem.creator = evt.content.user_id;
          elem.upvotes = new Set([]);
          elem.ignored = new Set([]);
          elem.querySelector('.topic-title').textContent = topic;
          let desc = evt.content.newlyAddedTopicDescription || "No description";
          elem.querySelector('.topic-description').textContent = desc;
          let ignore = elem.querySelector(".ignore");
          ignore.topic = topic
          ignore.addEventListener('click',ignoreTopic);
          let upvote = elem.querySelector(".upvote");
          upvote.topic = topic
          upvote.addEventListener('click',upvoteTopic);
          if (is_admin) {
            let icon = elem.querySelector(".topic-icon");
            icon.topic = topic;
            icon.addEventListener('click',deleteTopic);
          }
        
          $('#topic-list').appendChild(elem);
          updateAllTopicFlags();
      }
      else if (evt.content.delete_topic) {
        let topic = evt.content.topic;
        let item = findTopic(topic);
        if (item)
          $('#topic-list').removeChild(item);
      }
      else if (evt.content.vote_ignore || evt.content.vote_upvote) {
        //let topic = evt.content.newlyAddedTopic;
        setVote( evt.content.topic,
          evt.content.user_id,
          evt.content.vote_ignore,
          evt.content.vote_upvote);
      }
    }
  }
}

function findTopic(topic){
  let topicList = $('#topic-list');
  for (var index in topicList.children) {
    let topicItem = topicList.children[index];
    if (topicItem.topic == topic)
      return topicItem;
  }
  console.log("Failure finding topic '" & topic & "'");
}

let mode = {
  showNeedsVote: true,
  showMyTopics: false,
  showTopTopics: false,
}

function ShowNeedsVote() {
  mode.showNeedsVote = true;
  mode.showMyTopics = false;
  mode.showTopTopics = false;
  updateAllTopicFlags();
}

function ShowMyTopics() {
  mode.showNeedsVote = false;
  mode.showMyTopics = true;
  mode.showTopTopics = false;
  updateAllTopicFlags();
}

function ShowTopTopics() {
  mode.showNeedsVote = false;
  mode.showMyTopics = false;
  mode.showTopTopics = true;
  updateAllTopicFlags();
}

function updateAllTopicFlags() {
  let topicList = $('#topic-list');
  for (var index = 0; index < topicList.children.length; index++) {
    let topicItem = topicList.children[index];
    let child = topicItem.querySelector('.topic-title');
    let visible;
    if (mode.showNeedsVote) {
      visible = !(topicItem.ignored.has(user_id) || topicItem.upvotes.has(user_id));
      child.textContent = topicItem.topic;
    } else if (mode.showMyTopics) {
      visible = topicItem.creator == user_id;
      child.textContent = topicItem.topic;
    } else if (mode.showTopTopics) {
      visible = topicItem.upvotes.size >= 1;
      child.textContent = "["+topicItem.upvotes.size+"] "+ topicItem.topic;
    }
    if (visible) {
      topicItem.classList.add('visible');
      topicItem.classList.remove('display:none');
      topicItem.style.display = "";
      let icon = topicItem.querySelector('.mdl-list__item-avatar');
      if (topicItem.upvotes.size > 1){
        icon.textContent = "people";
      } else if (topicItem.upvotes.size > 1){
        icon.textContent = "people";//"person";
      } else {
        icon.textContent = "person-outline";
      }
    } else {
      topicItem.style.display = "none";
    }
  }
}
function setVote( topic, user, ignored, upvote) {
  let item = findTopic(topic);
  if (!item)
    return;
  if (ignored) {
    item.upvotes.delete(user);
    item.ignored.add(user);
  }
  if (upvote) {
    item.ignored.delete(user);
    item.upvotes.add(user);
  }
  updateAllTopicFlags();
}

function initUI() {
  $("#add-topic").addEventListener('click', function() {
    showPage('page-add');
  });
  $('#cancel-add-topic').addEventListener('click', function(evt) {
    showPage('page-main');
    evt.preventDefault();
  });
  $('#formNewTopic').onsubmit = function(evt) {
    evt.preventDefault();
    confirmAdd();
  }
  let tab = document.getElementById("mdc-tab-4");
  tab.addEventListener('click',ShowNeedsVote);
  tab = document.getElementById("mdc-tab-5");
  tab.addEventListener('click',ShowMyTopics);
  tab = document.getElementById("mdc-tab-6");
  tab.addEventListener('click',ShowTopTopics);
}

function showPage(page) {
  document.querySelector('.app-page.visible').classList.remove('visible');
  document.getElementById(page).classList.add('visible');
}

async function deleteTopic(evt) {
  // this seems hacky, but works. Consider reaching up to the grandparent?
  let topic = evt.target.topic || evt.target.parentNode.topic;
  console.log( "Delete " + topic);
  //message("Are you sure?")
  await room.sendEvent('m.room.message', { //com.github.girard.topic.myclass
    body: "Delete topic: " + topic + " (" + user_id + ")",
    msgtype: 'm.text',
    topic: topic,
    delete_topic: true,
    user_id: user_id,    
  });
}


async function upvoteTopic(evt) {
  // this seems hacky, but works. Consider reaching up to the grandparent?
  let topic = evt.target.topic || evt.target.parentNode.topic;
  console.log( "Upvote " + topic);
  await room.sendEvent('m.room.message', { //com.github.girard.topic.myclass
    body: "Upvote on topic: " + topic + " (" + user_id + ")",
    msgtype: 'm.text',
    topic: topic,
    vote_upvote: true,
    user_id: user_id,    
  });
}

async function ignoreTopic(evt) {
  // this seems hacky, but works. Consider reaching up to the grandparent?
  let topic = evt.target.topic || evt.target.parentNode.topic;
  console.log("Ignoring...")
  console.log( evt);
  await room.sendEvent('m.room.message', { //com.github.girard.topic.myclass
    body: "Ignore topic: " + topic + " (" + user_id + ")",
    msgtype: 'm.text',
    topic: topic,
    vote_ignore: true,
    user_id: user_id,    
  });
}

async function confirmAdd() {
  await room.sendEvent('m.room.message', { //com.github.girard.topic.myclass
    body: "Adding room: " + $('#newTopicTitle').value,
    msgtype: 'm.text',
    newlyAddedTopic:  $('#newTopicTitle').value,
    newlyAddedTopicDescription:  $('#newTopicDescription').value,
    user_id: user_id,    
  });
  showPage('page-main');
}
