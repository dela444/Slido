function f_redirect(h){
    if(h){
        window.location.href='http://localhost:3000/host';
    }else{
        window.location.href = 'http://localhost:3000/admin';
    }
}

$(document).ready(function() {
    $('#logout').click(function (){
        window.location.href='http://localhost:3000/logout';
    });

    if($('#ans').text()==='NaN%'){
        $('#ans').text('0%');
    }
    if($('#unans').text()==='NaN%'){
        $('#unans').text('0%');
    }
    let filter = 'all';

    $('.sum1').click(function() {
        $('.rotate').toggleClass('down');
    });

    $('#showCode').click(function (){
        let q = $('#headerq').data('event-id');
        window.location.href = `http://localhost:3000/host/${q}`;
    });

    var socket = io.connect('ws://localhost:3000');

    $('#end').click(function (){
        let ev = $('#headerq').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/event/check-end',
            type: 'POST',
            data:{ev:ev},
            success: function(response) {
                if(response.success){
                    socket.emit('end-event',{ev:ev});
                    $('#exampleModal2').modal('show');
                }else{
                    socket.emit('end-event',{ev:ev});
                    window.location.href='http://localhost:3000/host';
                }
            }
        });
    });

    $('.submit-e').click(function(){
        let ev = $('#headerq').data('event-id');
        socket.emit('end-event',{ev:ev});
    });

    $('.for-mails').click(function (){
        let emails = $('#emails').val();
        let ev = $('#headerq').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/event/send-invites',
            type: 'POST',
            data:{emails:emails,ev:ev},
            success: function(response) {}
        });
    });

    $('#unanswered').click(function() {
        let eventId= $('.answer-button').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/event/answered',
            type: 'POST',
            data:{ev:eventId, user:'h',an:1},
            success: function(response) {
                filter='unanswered';
                $('#table-questions').html(response);
            }
        });
    });
    $('#answered').click(function() {
        let eventId= $('.answer-button').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/event/answered',
            type: 'POST',
            data:{ev:eventId, user:'h',an:2},
            success: function(response) {
                filter='answered';
                $('#table-questions').html(response);
            }
        });
    });

    $('#all').click(function() {
        let eventId= $('.answer-button').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/event/sort-by-time',
            type: 'POST',
            data:{ev:eventId, user:'h',filter:'all'},
            success: function(response) {
                filter='all';
                $('#table-questions').html(response);
            }
        });
    });

    $('#sort-by-time').click(function() {
        let eventId= $('.answer-button').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/event/sort-by-time',
            type: 'POST',
            data:{ev:eventId, user:'h',filter:filter},
            success: function(response) {
                $('#table-questions').html(response);
            }
        });
    });

    $('#sort-by-likes').click(function() {
        let eventId= $('.answer-button').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/event/sort-by-likes',
            type: 'POST',
            data:{ev:eventId,user:'h',filter:filter},
            success: function(response) {
                $('#table-questions').html(response);
            }
        });
    });

    $('#questions').on('click', '.answer-button', function (){
        $(this).parents('td').siblings('td').children('.answer-form').toggle();
    });

    $('#overall').on('click', '.answer-button2', function (){
        $(this).parents('td').siblings('td').children('.answer-form2').toggle();
    });

    $('#overall').on('click', '.submit-answer2', function () {
        let answer = $(this).siblings('.answer-input2').val();
        $(this).siblings('.answer-input2').val('');
        let questionId = $(this).data('qu-id');
        let kl = $(this).parents('td').siblings('.ttt').find('.f-span').text();
        console.log(kl);
        console.info($(this).parents('td').siblings('.ttt').find('.f-span').text());
        socket.emit('answer', {answer: answer, questionId: questionId, question: kl});
    });

    $('#questions').on('click', '.submit-answer', function (){
        let answer = $(this).siblings('.answer-input').val();
        $(this).siblings('.answer-input').val('');
        let questionId = $(this).data('question-id');
        socket.emit('answer', {answer:answer,questionId:questionId});
    });

    socket.on('answerResponse', function (response){
        if (response.success) {
            $(`[data-question-id=${response.questionId}]`).parents('td').siblings('td').show();
            $(`[data-question-id=${response.questionId}]`).parents('td').siblings('td').html(`<h3>${response.answer}</h3>`);
        }
    });

    $('#overall').on('click', '.delete-button2', function () {
        let questionId = $(this).data('qu-id');
        $(`[data-qu-id=${questionId}]`).parents('tr').remove();
        socket.emit('delete', {questionId: questionId});
    });

    $('#questions').on('click', '.delete-button', function (){
        let questionId = $(this).data('question-id');
        socket.emit('delete', {questionId:questionId});
    });

    socket.on('deleteResponse', function(response){
        if(response.success){
            $(`[data-question-id=${response.questionId}]`).parents('tr').remove();
        }
    });

    socket.on('askResponse', function(response){
        if(response.success){
            $('#table-questions').prepend(`<tr class="question d-flex flex-column">
            <td class="d-flex flex-row justify-content-between td2 hvr-underline-reveal">
              <div class="d-flex flex-row justify-content-between" style="width: 100%;">
                <h3 class="f-text">${response.asked}</h3>
                <div class="d-flex flex-row align-items-center">
                  <div style="float: right;display: flex;flex-wrap: nowrap;margin-right: 5px;">
                    <span style="font-size: 1.3vw">0</span>
                    <img src="/images/like.png" style="width: 1.5vw">
                  </div>
                  <div style="float: right;display: flex;flex-wrap: nowrap;">
                    <button class="answer-button btn btn-outline-success btn-rounded" data-question-id="${response.c}" data-event-id="${response.ev}" style="font-size: 1.2vw;align-self: center">Answer</button>
                    <button class="delete-button btn btn-outline-danger btn-rounded" data-question-id="${response.c}" data-event-id="${response.ev}" style="font-size: 1.2vw">Delete</button>
                    <button class="hide-button btn btn-outline-warning btn-rounded" data-question-id="${response.c}" data-event-id="${response.ev}" style="font-size: 1.2vw">Hide</button>
                  </div>
                </div>
              </div>
            </td>
            <td style="padding:0">
              <form class="answer-form" data-question-id="${response.c}" style="display: none;">
                <textarea class="answer-input" data-question-id="${response.c}" id="textarea2"></textarea>
                <button class="submit-answer btn btn-rounded btn-success" data-question-id="${response.c}" data-event-id="${response.ev}" style="float: right">Answer</button>
              </form>
            </td>
            <td class="td2 bg-answer2" style="display: none"></td>
          </tr>`);
        }else{
            $('#hidden-q').append(`<tr class="d-flex flex-column">
            <td class="p-0 d-flex flex-row justify-content-between">
              <span class="f-span">${response.asked}</span>
              <div class="hidd p-0">
                <button type="button" class="answer-button2 btn-rounded btn btn-sm btn-outline-success">Answer</button>
                <button type="button" class="delete-button2 btn-rounded btn btn-sm btn-outline-danger" data-qu-id="${response.c}">Delete</button>
              </div>

            </td>
            <td style="padding:0">
              <form class="answer-form2" data-qu-id="${response.c}" style="display: none;">
                <textarea class="answer-input2" data-qu-id="${response.c}" id="textarea3"></textarea>
                <button class="submit-answer2 btn btn-rounded btn-success" data-qu-id="${response.c}" data-ev-id="${response.ev}" style="float: right">Answer</button>
              </form>
            </td>
          </tr>`);
        }
    });

    $('#questions').on('click', '.hide-button', function (){
        let questionId = $(this).data('question-id');
        socket.emit('hide',{questionId:questionId});
    });

    socket.on('hideResponse',function (response){
        if (response.success) {
            let ev = $('#headerq').data('event-id');
            let questionText = $(`[data-question-id=${response.questionId}]`).parent().parent().siblings('h3').text();
            let answ = $(`[data-question-id=${response.questionId}]`).parent('td').siblings('td').children('h3').text();
            if(!answ){
                $('#hidden-q').append(`<tr class="d-flex flex-column">
            <td class="d-flex flex-row justify-content-between ttt">
              <span style="flex-wrap: wrap" class="f-span">${questionText}</span>
              <div class="hidd">
                <button type="button" class="answer-button2 btn-rounded btn btn-sm btn-outline-success" style="font-size: 1.5vw">Answer</button>
                <button type="button" class="delete-button2 btn-rounded btn btn-sm btn-outline-danger" style="font-size: 1.5vw" data-qu-id="${response.questionId}">Delete</button>
              </div>

            </td>
            <td style="padding:0">
              <form class="answer-form2" data-qu-id="${response.questionId}" style="display: none;">
                <textarea class="answer-input2" data-qu-id="${response.questionId}" id="textarea3"></textarea>
                <button class="submit-answer2 btn btn-rounded btn-success" data-qu-id="${response.questionId}" data-ev-id="${ev}" style="float: right">Answer</button>
              </form>
            </td>
          </tr>
        `);
            }else{
                $('#hidden-q').append(`<tr class="d-flex flex-column">
            <td class="d-flex flex-row justify-content-between">
              <span style="flex-wrap: wrap">${questionText}</span>
              <div class="hidd">
                <button type="button" class="answer-button2 btn-rounded btn btn-sm btn-outline-success">Answer</button>
                <button type="button" class="delete-button2 btn-rounded btn btn-sm btn-outline-danger" data-qu-id="${response.questionId}">Delete</button>
              </div>

            </td>
            <td style="padding:0">
              <form class="answer-form2" data-qu-id="${response.questionId}" style="display: none;">
                <textarea class="answer-input2" data-qu-id="${response.questionId}" id="textarea3"></textarea>
                <button class="submit-answer2 btn btn-rounded btn-success" data-qu-id="${response.questionId}" data-ev-id="${ev}" style="float: right">Answer</button>
              </form>
            </td>
            <td style="opacity: 0.45">
                <span>${answ}</span>
            </td>
          </tr>
            `);
            }
            $(`[data-question-id=${response.questionId}]`).parents('tr').remove();
        }
    });

    socket.on('likeResponse', function (response){
        $(`[data-question-id=${response.questionId}]`).parent().siblings('div').children('span').text(response.likes);
    });
});