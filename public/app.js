const socket = io();
const $ = id => document.getElementById(id);
let isHost = false, joined = false, currentState = null;
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2600)}
function showGame(code, host){$('entry').classList.add('hidden');$('game').classList.remove('hidden');$('past').classList.toggle('hidden',!host);$('roomCodeLabel').textContent=code;$('roleLabel').textContent=host?'HOST':'PLAYER';$('hostPanel').classList.toggle('hidden',!host);$('playerPanel').classList.toggle('hidden',host);isHost=host;joined=true}
$('createBtn').onclick=()=>socket.emit('host:create',{videoUrl:$('videoUrl').value.trim()});
$('joinBtn').onclick=()=>socket.emit('player:join',{code:$('roomCode').value,name:$('playerName').value});
$('submitBtn').onclick=()=>{socket.emit('player:answer',{answer:$('answerInput').value});};
$('answerInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('submitBtn').click()});
$('setQuestionBtn').onclick=()=>socket.emit('host:question',{question:$('questionInput').value});
$('closeQuestionBtn').onclick=()=>socket.emit('host:close');
$('setKeyBtn').onclick=()=>socket.emit('host:key',{answer:$('correctInput').value,points:$('pointsInput').value});
$('finishBtn').onclick=()=>{if(confirm('Finish this game and save its results?'))socket.emit('host:finish')};
$('loadHistory').onclick=()=>socket.emit('host:history');
socket.on('created',({code})=>{showGame(code,true);toast('Room created. Share the code with players.');socket.emit('host:history')});
socket.on('joined',({code})=>{showGame(code,false);toast('You joined the room.')});
socket.on('errorMsg',msg=>toast(msg));
socket.on('answerSaved',({message})=>{toast(message);$('answerStatus').textContent='Answer submitted — waiting for the next question.';$('answerInput').value=''});
socket.on('state',state=>{
 currentState=state;
 $('questionLabel').textContent=`QUESTION ${state.question}${state.questionOpen?' · OPEN':' · CLOSED'}`;
 if(state.videoId && $('yt').src!==`https://www.youtube-nocookie.com/embed/${state.videoId}?rel=0`)$('yt').src=`https://www.youtube-nocookie.com/embed/${state.videoId}?rel=0`;
 $('scores').innerHTML=state.players.length?state.players.map((p,i)=>`<div class="score-row"><span class="rank">${String(i+1).padStart(2,'0')}</span><strong>${esc(p.name)}</strong><span class="score">${p.score} pts</span></div>`).join(''):'<p class="muted">No players yet.</p>';
 $('players').innerHTML=state.players.map(p=>`<span class="player-chip">${esc(p.name)}${p.answered?' ✓':''}</span>`).join('')||'<span class="muted tiny">Waiting for players</span>';
 $('history').innerHTML=state.history.length?state.history.map(p=>`<div style="margin-bottom:14px"><strong>${esc(p.name)}</strong>${p.answers.length?p.answers.map(a=>`<div class="history-row"><span class="muted">Question ${a.question}</span><span>${esc(a.answer)}</span><span class="result ${a.correct===true?'correct':a.correct===false?'wrong':'pending'}">${a.correct===true?'✓ Correct':a.correct===false?'✕ Incorrect':'Pending'} · ${a.points} pts</span></div>`).join(''):'<p class="tiny muted">No answers submitted yet.</p>'}</div>`).join(''):'<p class="muted">Waiting for players...</p>';
 if(!isHost){const me=state.players.find(p=>p.id===socket.id);const answered=me&&me.answered;$('submitBtn').disabled=!state.questionOpen||answered;$('answerInput').disabled=!state.questionOpen||answered;$('answerStatus').textContent=answered?'Answer submitted for this question.':state.questionOpen?'Submit one answer for the current question.':'Submissions are closed.';}
});
socket.on('history',games=>{
 $('pastGames').innerHTML=games.length?games.map(g=>`<div class="history-row"><span class="muted">${new Date(g.date).toLocaleString()}</span><span>${g.players.map(p=>`${esc(p.name)} — ${p.score} pts`).join('<br>')}</span><span class="muted">${g.code}</span></div>`).join(''):'<p class="muted">No saved games yet.</p>';
});
socket.on('finished',()=>toast('Game saved to history.'));
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
