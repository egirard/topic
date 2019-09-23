import * as lobby from '../third_party/lobby/src/lobby.js';

document.addEventListener('DOMContentLoaded', init);

let client;
let room;
const TOPIC_ROOM = '!zIlIGXfNAskJbYZvgO:matrix.org';
const MATRIX_USERNAME = 'topic-bot';
const MATRIX_PASSWORD = 'riot.IM.PASSWORD';
let user_id;

function $(query) {
  return document.querySelector(query);
}

async function init() {
  user_id = localStorage.getItem('user_id');
  if (!user_id) {
    user_id = 'user' + Math.floor(Math.random() * 1000000);
    localStorage.setItem('user_id', user_id);
  }
  console.log(user_id);

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
            // vote for pedro
          }
          let elem = cloneTemplate('topic');
          elem.creator = evt.content.user_id;
          elem.upvotes = new Set([]);
          elem.ignored = new Set([]);
          let topic = evt.content.newlyAddedTopic;
          elem.querySelector('.topic-title').textContent = topic;
          let desc = evt.content.newlyAddedTopicDescription || "No description";
          elem.querySelector('.topic-description').textContent = desc;
          // Add details and handlers
          elem.querySelector('.topic-description').textContent = desc;/////
          let ignore = elem.querySelector(".ignore");
          ignore.topic = topic
          ignore.addEventListener('click',ignoreTopic);
          let upvote = elem.querySelector(".upvote");
          upvote.topic = topic
          upvote.addEventListener('click',upvoteTopic);
        
          $('#topic-list').appendChild(elem);
      }
      else if (evt.content.vote_ignore || evt.content.vote_upvote) {
        let topic = evt.content.newlyAddedTopic;
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
    let child = topicItem.querySelector('.topic-title');
    if (child && child.textContent && child.textContent == topic)
      return topicItem;
  }
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
    } else if (mode.showMyTopics) {
      visible = topicItem.creator == user_id;
    } else if (mode.showTopTopics) {
      visible = topicItem.upvotes.size >= 1;
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
//      topicItem.classList.remove('visible');      
    }
  }
}

function setVote( topic, user, ignored, upvote) {
  let item = findTopic(topic);
  if (ignored) {
    //if (item.upvotes.has( user))
      item.upvotes.delete(user);
    //if (!item.ignored.has( user))
      item.ignored.add(user);
  }
  if (upvote) {
    //if (item.ignored.has( user))
      item.ignored.delete(user);
    //if (!item.upvotes.has( user))
      item.upvotes.add(user);
  }
  updateAllTopicFlags();
}

function initUI() {
  let button = document.getElementById("AddTopic");
  button.addEventListener('click',addRoom);
  $('#formNewTopic').onsubmit = function(evt) {
    evt.preventDefault();
    confirmAdd();
  }
  // TODO: Wire tabstrip up to mode
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

async function addRoom() {
  showPage('page-add');
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