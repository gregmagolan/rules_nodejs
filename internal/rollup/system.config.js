(function(global) {
System.config({
  packages: {
    '': {map: TMPL_entry_points, defaultExtension: 'js'},
  }
});
System.import('TMPL_main_entry_point').catch(function(err) {
  console.error(err);
});
})(this);
