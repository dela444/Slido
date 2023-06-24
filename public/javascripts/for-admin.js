$(window).resize(function (){
    drawChart();
});

$(document).ready(function() {
    $('#za_extend').click(function (){
        if (window.matchMedia("(max-width: 450px)").matches) {
            $(this).parents('#overall2').toggleClass('extend');
        }
    });

    var socket = io.connect('ws://localhost:3000');

    $('#logout').click(function (){
        window.location.href='http://localhost:3000/logout';
    });

    $('.block-b').click(function (e){
        e.stopPropagation();
        let hostId = $(this).data('host');
        $('#block').attr('data-host', hostId);
    });

    $('.for-hosts').on('click','.for-redirection',function (){
        let eventId = $(this).data('event');
        window.location.href = `http://localhost:3000/meet/${eventId}`;
    });

    $('#block').click(function (){
        let hostId = $(this).data('host');
        let block = $('input[name=radio-group]:checked').val();
        $.ajax({
            url: 'http://localhost:3000/admin/block-host',
            type: 'POST',
            data:{hostId:hostId,block:block},
            success: function(response) {}
        });
    });

    $('.sum1').click(function() {
        $('.rotate').toggleClass('down');
    });

    $('.for-hosts').click(function () {
        let e = $(this).children('.for-events');
        if(e.is(':empty')){
            let hostId = e.data('host-id');
            $.ajax({
                url: 'http://localhost:3000/admin/events',
                type: 'POST',
                data:{hostId:hostId},
                success: function(response) {
                    e.html(response);
                    e.show();
                }
            });
        }else{
            if (e.css('display') === 'none') {
                e.show();
            } else {
                e.hide();
            }
        }
    });

    $('.for-hosts').on('click', '.delete-button-events',function (event){
        event.stopPropagation();
        let e = $(this).data('event-id');
        socket.emit('delete-event',{eventId:e});
    });

    socket.on('delete-eventResponse',function (response){
        $(`[data-event-id=${response.eventId}]`).parents('.for-redirection').remove();
    });

    $('.delete-host').click(function (e){
        e.stopPropagation();
        let hostId = $(this).data('host');
        $.ajax({
            url: 'http://localhost:3000/admin/delete-host',
            type: 'POST',
            data:{hostId:hostId},
            success: function(response) {
                $(`[data-host=${response.hostId}]`).parents('tr').remove();
            }
        });
    });

    $('#for-forbidden').click(function (){
        let w = $(this).siblings('input').val();
        $(this).siblings('input').val('');
        $.ajax({
            url: 'http://localhost:3000/admin/add-word',
            type: 'POST',
            data:{word:w},
            success: function(response) {
                $(`#forbidden`).append(`<tr>
              <td style="flex:1;" class="d-flex flex-row justify-content-between">
                <span>${response.word}</span>
                <button type="button" class="delete-word btn btn-rounded btn-outline-danger">Delete</button>
              </td>
            </tr>`);
            }
        });
    });

    $('#forbidden').on('click', '.delete-word',function (){
        let w = $(this).siblings('span').text();
        let e = $(this).parents('tr');
        $.ajax({
            url: 'http://localhost:3000/admin/delete-word',
            type: 'POST',
            data:{word:w},
            success: function(response) {
                if(response.success){
                    e.remove();
                }
            }
        });
    });
});