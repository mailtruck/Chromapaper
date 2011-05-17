/*familyLinker.js
  
  Requires:
 * jQuery
 * family.js
 * linker.css
 */
var familyLinker={
};

//Hook: Establishes DOM and Event Listeners
familyLinker.hook=function() {
  $.each(family,function(id) {
    $('#family_linker')
      .append($('<a />')
        .addClass('linker')
        .text(this.short)
        .attr({
          'id':'linker_'+id,
          'href':'chrome-extension://'+id+'/'+this.options_page
        })
      )
      .append($('<span />')
        .addClass('linker_divider')
        .html(' &bull; ')
      );
  });
  $('#family_linker').append($('<a />')
    .addClass('linker_manage')
    .text('Manager')
    .attr('href','family.html')
  );
        
  
  //Extension Hooks
  //0: Display None
  //1: Display Block
  chrome.management.onUninstalled.addListener(function(extid) {
    familyLinker.handleExtension(extid,0);
  });  
  chrome.management.onInstalled.addListener(function(ext) {
    familyLinker.handleExtension(ext.id,1);
  });
  chrome.management.onEnabled.addListener(function(ext) {
    familyLinker.handleExtension(ext.id,1);
  });
  chrome.management.onDisabled.addListener(function(ext) {
    familyLinker.handleExtension(ext.id,0);
  });
  chrome.management.getAll(function(exts) {
    $.each(exts,function() {
      familyLinker.handleExtension(this.id,this.enabled);
    });
  });
}

//handleExtension: updates button based on extension and status
familyLinker.handleExtension=function(extid,stat) {
  if(family[extid]) {
    $('#linker_'+extid)
      .css('display',stat?'inline':'none')
      .next('.linker_divider')
      .data('stat',stat);
    familyLinker.updateBullets();
  }
}

//updateBullets: hides/reveals bullet point spacers
familyLinker.updateBullets=function() {
  $('.linker_divider')
    .css('display','none')
    .each(function() {
      if($(this).data('stat')) {
        $(this).css('display','inline');
      }
    });
}

$(familyLinker.hook);