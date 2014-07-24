$(function() {
    $(".menu a").filter(function() {
        return this.href === $(location).attr("href").replace(/(\/(page|edit)\/.*$|\?.*)/i, "");
    }).addClass("on");
    
    $("#uploadfile").click(function(e) {
        e.preventDefault();
        $('#file-details').empty();
        $("#control").replaceWith($("#control").clone(true));
        $('#popup-div').bPopup({
            modalClose: false,
            modalColor: 'white',
            opacity: 0.8
        });
    });
    $("#close-popup").click(function() {
        $('#upload-target').remove();
        $('#file-details').empty();
        $("#control").replaceWith($("#control").clone(true));
        $("#popup-div").bPopup().close();
    });

    $('#submit-file').click(function() {
        $('#file-details').html('<img src="/images/loading.gif">');
        if ($('iframe[name=upload-target]').length < 1) {
            var iframe = document.createElement('iframe');
            $(iframe).css('display','none');
            $(iframe).attr('src','#');
            $(iframe).attr('name','upload-target');
            $(iframe).attr('id','upload-target');
            $('#upload-form').append(iframe);
            $('#upload-form').attr('target','upload-target');
        }
    });

    $('#tab1').click(function() {
        $('#tab2').attr('class', 'off');
        $('#tab1').attr('class', 'on');
        $('#upload').show();
        $('#files').hide();
    });
    $('#tab2').click(function() {
        $('#tab1').attr('class', 'off');
        $('#tab2').attr('class', 'on');
        $('#upload').hide();
        $('#files').show();
    });
});