//familyBold.js

$(function() {
  var detect=/^chrome-extension:\/\/([a-z]{32})\//;
  var result=detect.exec(location.href);
  var extid =result[1];
  $('#linker_'+extid).css({
    'font-weight':'bold',
    'color':'#000'
  });
});