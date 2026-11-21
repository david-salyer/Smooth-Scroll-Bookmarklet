javascript:(function(){
  // Toggle off and clean up if this bookmarklet/script is already active on the page
  if(window.hasOwnProperty('_autoScrollState')){
    // Stop the animation loop flag
    window._autoScrollState.active=false;
    // Remove the capture-phase keydown listener so arrow keys behave normally again
    window.removeEventListener('keydown',window._autoScrollHandler,true);
    // Delete the global state object so running the bookmarklet again re-enables it
    delete window._autoScrollState;
    return;
  }

  // Initialize shared scroll state:
  // active: whether auto-scrolling is currently running
  // dir: 1 for down (ArrowDown), -1 for up (ArrowUp), 0 for idle
  // speedIndex: speed multiplier scale from 5 to 50 (10 = 1x base speed)
  // accumulator: fractional pixel buffer to support sub-pixel speeds per frame
  window._autoScrollState={active:false,dir:0,speedIndex:10,accumulator:0};

  // Stores the current requestAnimationFrame ID so it can be canceled on direction change/stop
  let animId=null;

  // Global keydown handler attached in capture phase (true) to intercept arrow keys early
  window._autoScrollHandler=function(e){
    // Only intercept the four arrow keys
    if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='ArrowLeft'||e.key==='ArrowRight'){
      // Prevent default browser scrolling/cursor movement and stop page listeners from seeing the key
      e.preventDefault();
      e.stopPropagation();
      
      // Adjust speedIndex between 5 and 50 using Left (-1) and Right (+1) arrows
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
        let adjustment=e.key==='ArrowRight'?1:-1;
        window._autoScrollState.speedIndex=Math.max(5,Math.min(50,window._autoScrollState.speedIndex+adjustment));
        return;
      }
      
      // Map ArrowDown to 1 (down) and ArrowUp to -1 (up)
      let pressedDir=e.key==='ArrowDown'?1:-1;

      // If already scrolling, pause the current animation frame loop first
      if(window._autoScrollState.active){
        window._autoScrollState.active=false;
        cancelAnimationFrame(animId);
        // Pressing the same direction key while active acts as a pause/stop toggle
        if(window._autoScrollState.dir===pressedDir){
          return;
        }
      }

      // Start or reverse auto-scrolling in the newly chosen direction and reset fractional pixels
      window._autoScrollState.active=true;
      window._autoScrollState.dir=pressedDir;
      window._autoScrollState.accumulator=0;

      // Determine whether a focused editable element should scroll instead of the main window
      let target=document.activeElement;
      let isText=target&&(target.tagName==='TEXTAREA'||target.isContentEditable);
      let container=isText?target:window;
      
      // Per-frame animation callback
      function step(){
        // Exit immediately if auto-scroll was deactivated
        if(!window._autoScrollState.active)return;

        // Record scroll position before applying movement
        let prev=isText?container.scrollTop:container.scrollY;

        // Use slightly faster base speed downward (0.73 px/frame) than upward (0.5 px/frame)
        let baseSpeed=window._autoScrollState.dir===1?0.73:0.5;
        let currentSpeed=baseSpeed*(window._autoScrollState.speedIndex/10);
        
        // Accumulate fractional movement and extract whole pixels to scroll
        window._autoScrollState.accumulator+=currentSpeed;
        let scrollAmount=Math.floor(window._autoScrollState.accumulator);
        
        if(scrollAmount>0){
          // Keep remainder in accumulator and scroll by whole pixels in `dir`
          window._autoScrollState.accumulator-=scrollAmount;
          container.scrollBy(0,window._autoScrollState.dir*scrollAmount);
        }
        
        // Check if scroll position actually changed; if not (e.g., hit top/bottom boundary), stop
        let current=isText?container.scrollTop:container.scrollY;
        if(current===prev && scrollAmount>0){
          window._autoScrollState.active=false;
        }else{
          // Schedule the next frame
          animId=requestAnimationFrame(step);
        }
      }

      // Kick off the first animation frame
      animId=requestAnimationFrame(step);
    }
  };

  // Listen for keydown in the capture phase so it runs before inner elements or page scripts
  window.addEventListener('keydown',window._autoScrollHandler,true);
})();