$(document).ready(function() {
    let filter='all';
    var socket = io.connect('ws://localhost:3000');
    socket.on('end-eventResponse',function (response){
        let eventId= $('.ask-button').data('event-id');
        if(eventId===response.ev){
            window.location.href = `http://localhost:3000/event/${eventId}/rating`;
        }
    });

    $('#unanswered').click(function() {
        let eventId= $('.ask-button').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/event/answered',
            type: 'POST',
            data:{ev:eventId, user:'u',an:1},
            success: function(response) {
                filter='unanswered';
                $('#table-questions').html(response);
            }
        });
    });

    $('#answered').click(function() {
        let eventId= $('.ask-button').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/event/answered',
            type: 'POST',
            data:{ev:eventId, user:'u',an:2},
            success: function(response) {
                filter='answered';
                $('#table-questions').html(response);
            }
        });
    });

    $('#all').click(function() {
        let eventId= $('.ask-button').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/event/sort-by-time',
            type: 'POST',
            data:{ev:eventId, user:'u',filter:'all'},
            success: function(response) {
                filter='all';
                $('#table-questions').html(response);
            }
        });
    });

    $('#sort-by-time').click(function() {
        let eventId= $('.ask-button').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/event/sort-by-time',
            type: 'POST',
            data:{ev:eventId, user:'u',filter:filter},
            success: function(response) {
                $('#table-questions').html(response);
            }
        });
    });

    socket.on('answerResponse', function (response){
        if (response.success) {
            console.log(response.question);
            if($(`[data-question-id=${response.questionId}]`).length===0){
                $('#table-questions').prepend(`
          <tr class="question d-flex flex-column tr1">
          <td class="d-flex flex-row justify-content-between td1 proba">
              <h3 class="f-q">${response.question}</h3>
              <div style="float: right" class="for-likes" data-question-id ="${response.questionId}">
                  <span>0</span>
                  <img src="/images/like1.png" class="im">
          </td>
          <td class="td1 bg-answer">${response.answer}</td>`);
            }else{
                $(`[data-question-id=${response.questionId}]`).parents('td').siblings('td').show();
                $(`[data-question-id=${response.questionId}]`).parents('td').siblings('td').html(`<h3>${response.answer}</h3>`);
            }
        }
    });

    $('#sort-by-likes').click(function() {
        let eventId= $('.ask-button').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/event/sort-by-likes',
            type: 'POST',
            data:{ev:eventId,user:'u',filter:filter},
            success: function(response) {
                $('#table-questions').html(response);
            }
        });
    });

    $('.ask-button').click(function (){
        let eventId= $(this).data('event-id');
        let asked = $(this).siblings('.ask-input').val();
        $(this).siblings('.ask-input').val('');
        if(asked !== ''){
            socket.emit('ask', {eventId:eventId,asked: asked});
        }
    });

    $('#eventi').on('click', '.for-likes', function (){
        let questionId = $(this).data('question-id');
        let liked = localStorage.getItem(questionId) === 'true';
        let likes = parseInt($(this).children('span').text());
        if(!liked){
            $(this).children('img').css('width','2vw');
            $(this).children('img').attr('src','/images/like2.png')
            $(this).children('span').css('font-size','2vw');
        }else{
            $(this).children('img').css('width','1.5vw');
            $(this).children('img').attr('src', '/images/like1.png')
            $(this).children('span').css('font-size','1.5vw');
        }
        socket.emit('like',{liked:liked,questionId:questionId,likes:likes});
    });

    socket.on('likeResponse', function(response){
        $(`[data-question-id="${response.questionId}"]`).children('span').text(response.likes);
        localStorage.setItem(response.questionId, response.liked);
    });

    socket.on('askResponse', function(response){
        if(response.success){
            $('#table-questions').prepend(`
          <tr class="question d-flex flex-column tr1">
          <td class="d-flex flex-row justify-content-between td1 proba">
              <h3 class="f-q">${response.asked}</h3>
              <div style="float: right" class="for-likes" data-question-id ="${response.c}">
                  <span>0</span>
                  <img src="/images/like1.png" class="im">
          </td>
          <td style="display: none" class="td1 bg-answer"></td>
        </tr>`);
            localStorage.setItem(JSON.stringify(response.c),'false');
        }
    });

    socket.on('deleteResponse', function(response){
        if(response.success){
            $(`[data-question-id=${response.questionId}]`).parents('tr').remove();
        }
    });

    socket.on('hideResponse', function (response){
        if(response.success){
            $(`[data-question-id=${response.questionId}]`).parents('tr').remove();
        }
    });
});