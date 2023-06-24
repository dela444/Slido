function redirectToEvent(eventId) {
    eventId = eventId.toString().slice(1);//ovo je potrebno jer funkcija nece da prima parametar ako pocinje sa nulom
    window.location.href = `http://localhost:3000/meet/${eventId}`;
}

$(window).resize(function (){
    drawChart();
});

function submitForm(){
    let c = $('#c').val();
    $.ajax({
        url: 'http://localhost:3000/host/check-code',
        type: 'POST',
        data:{code:c},
        success: function(response) {
            if(response.success){
                document.getElementById('forma').submit();
            }else{
                $('#alrt').show();
            }
        }
    });
}

$(document).ready(function (){
    $('#za_extend').click(function (){
        $(this).parents('#overall').toggleClass('extend');
    });

    $('#logout').click(function (){
        window.location.href='http://localhost:3000/logout';
    });

    $('.sum1').click(function() {
        $('.rotate').toggleClass('down');
    });

    $('.delete-button-events').click(function (event){
        event.stopPropagation();
        let e = $(this).parents('tr').data('event-id');
        $.ajax({
            url: 'http://localhost:3000/host/delete-event',
            type: 'POST',
            data:{ev:e},
            success: function(response) {
                if(response.success){
                    $(`[data-event-id=${response.eventId}]`).remove();
                }
            }
        });
    });

    $("#sum1").click(function(){
        $(this).children('img').toggleClass("down");
    });
});