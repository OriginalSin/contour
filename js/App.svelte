<script>
  // @ts-nocheck
  
  import { onMount } from 'svelte';
  // import ImageTransform from './lib/webgl/ImageTransform.js';
  import Canvas from './canvas.js'
  import Pixel from './pixel.js'
  import Canny from './canny.js'
  import Helpers from './helpers.js'
  import ContourFinder from './contour.js'
  import Filters from './filters.js'
  import ImageProvider from './image-provider.js'
  
  // import src from './assets/334_256.jpg'
  let contOn='contOn', dropAreaElement, selectedFile;
  let mainNode, imageNode, contentNode, fileSelect;
  let files = $state();
  let src = $state('');

  const fileList = [
    '../assets/334.jpg',
    '../assets/334_256.jpg',
    '../assets/svetof.png'
  ];
  // var image;
  let contourFinder;
  var startTime = 0;
  var maxResolution = 400;

  var resultWidth;
  var resultHeight;

  var imageWidth;

  var filters,
      canny,
      canvas;

  var DIRECTIONS = {
    N: 0,
    NE: 1,
    E: 2,
    SE: 3,
    S: 4,
    SW: 5,
    W: 6,
    NW: 7,
    SAME: 8
  };

onMount(()=> {
  const _stop = e => {
    e.preventDefault();
    e.stopPropagation();
  }

  const _handleDrop = e => {
    _stop(e);
    const fr = new FileReader();
    fr.onloadend = () => { src = fr.result; };
    fr.readAsDataURL(e.target.files && e.target.files[0] || e.dataTransfer.files[0]);

  }
  dropAreaElement.addEventListener('click', () => { fileSelect.click(); }, false);
  dropAreaElement.addEventListener('dragover', _stop, false);
  dropAreaElement.addEventListener('drop', _handleDrop, false);
  fileSelect.addEventListener('change', _handleDrop, false);
});

const chkImgSize = (image) => {
  const {width, height} = image;
  imageWidth = width;
  if (width > height) {
    resultWidth = Math.min(width, maxResolution);
    resultHeight = parseInt(resultWidth * height / width, 10);
  } else {
    resultHeight = Math.min(height, maxResolution);
    resultWidth = parseInt(resultHeight * width / height, 10);
  }
  var polylines = document.querySelectorAll('#svg2 polyline');
  if (polylines.length) {
    for (var i = 0; i < polylines.length; i++) {
      polylines[i].parentNode.removeChild(polylines[i]);
    }
  }

  // removePrevImg();
  imageNode = image;
  contentNode.appendChild(imageNode);
  return {w: resultWidth, h: resultHeight};

}
const start = () => {
  var imageProvider = new ImageProvider({
    element: dropAreaElement,
    onImageRead: prepData
  });

  imageProvider.init();
  // prepData();
}

const prepData = async (image) => {
  dropAreaElement.classList.add('dropped');

  const {w, h} = chkImgSize(image);

  canvas = new Canvas('canvas',  w, h);
  await canvas.loadImg(image.src, 0, 0,  w, h);

  canny = new Canny(canvas);
  filters = new Filters(canvas);

  canvas.setImgData(filters.grayscale());
  canvas.setImgData(filters.gaussianBlur(5, 1));

  canvas.setImgData(canny.gradient('sobel'));
  canvas.setImgData(canny.nonMaximumSuppress());
  canvas.setImgData(canny.hysteresis());

  process();
}


  function process() {
    startTime = Date.now();

    contourFinder = new ContourFinder();

    contourFinder.init(canvas.getCanvas());
    contourFinder.findContours();

    console.log('contourFinder.allContours.length): ' + contourFinder.allContours.length);
    var secs = (Date.now() - startTime) / 1000;
    console.log('Finding contours took ' + secs + 's');

    drawContours();
  }

  function findOutDirection(point1, point2) {
    if (point2.x > point1.x) {
      if (point2.y > point1.y) {
        return DIRECTIONS.NE;
      } else if (point2.y < point1.y) {
        return DIRECTIONS.SE;
      } else {
        return DIRECTIONS.E;
      }
    } else if (point2.x < point1.x) {
      if (point2.y > point1.y) {
        return DIRECTIONS.NW;
      } else if (point2.y < point1.y) {
        return DIRECTIONS.SW;
      } else {
        return DIRECTIONS.W;
      }
    } else {
      if (point2.y > point1.y) {
        return DIRECTIONS.N;
      } else if (point2.y < point1.y) {
        return DIRECTIONS.S;
      } else {
        return DIRECTIONS.SAME;
      }
    }
  }

  function drawContours() {
    for (var i = 0; i < contourFinder.allContours.length; i++) {
      console.log('contour #' + i + ' length: ' + contourFinder.allContours[i].length);
      drawContour(i);
    }
    animate();
  }

  function drawContour(index) {
    var points = contourFinder.allContours[index];

    var optimizedPoints = [],
        direction = null;

    points.reduce(function(accumulator, currentValue, currentIndex, array) {
      if (optimizedPoints.length === 0) {
        optimizedPoints.push(currentValue);
        return null;
      } else {
        var direction = findOutDirection(currentValue, array[currentIndex - 1]);
        if (direction === DIRECTIONS.SAME) {
          return accumulator;
        }
        if (direction !== accumulator) {
          optimizedPoints.push(currentValue);
        } else {
          optimizedPoints[optimizedPoints.length -1] = currentValue;
        }
        return direction;
      }
    }, null);

    var pointsString = optimizedPoints.map(function(point) {
      return point.x + ',' + point.y;
    }).join(' ');

    var polyline = document.createElementNS('http://www.w3.org/2000/svg','polyline');
    polyline.setAttributeNS(null, 'points', pointsString.trim());

    var svg = document.querySelector('#svg2');
    svg.appendChild(polyline);
    svg.setAttribute('viewBox', '0 0 ' + resultWidth + ' ' + resultHeight);
    svg.setAttribute('style', 'width:' + imageWidth + 'px');
  }

  function animate() {
    var polylines = document.querySelectorAll('#svg2 polyline');
    [].forEach.call(polylines, function(polyline, index) {
      var length = contourFinder.allContours[index].length;
      // Clear any previous transition
      polyline.style.transition = polyline.style.WebkitTransition =
        'none';

      // Set up the starting positions
      polyline.style.strokeDasharray = length + ' ' + length;
      polyline.style.strokeDashoffset = length;
      // Trigger a layout so styles are calculated & the browser
      // picks up the starting position before animating
      polyline.getBoundingClientRect();
      // Define our transition
      polyline.style.transition = polyline.style.WebkitTransition =
        'stroke-dashoffset 2s linear';
      // Go!
      polyline.style.strokeDashoffset = '0';
    });
  }

const imageOnLoad = (ev) => {
  imageNode = ev.target;
  prepData(imageNode);
}

const onChange = (ev) => {
  const target = ev.target;
  const {name} = target;

  if (target.tagName.toLowerCase() === 'select') {
    // removePrevImg();

    src = target.value;
    if (!src) dropAreaElement.classList.remove('dropped');

  } else {
    // debugger
    const cls = mainNode.classList;
    if (target.checked) cls.add(name);
    else cls.remove(name);
  }
}

</script>

<main bind:this={mainNode} class="imgOn contOn">
  <div class="card">
    Контур: <input name="contOn" type="checkbox" checked onchange={onChange} />
    Image: <input name="imgOn" type="checkbox" checked onchange={onChange} />
    <select name="selFile" bind:value={selectedFile} onchange={onChange}>
      <option value="">Выбрать файл</option>
      {#each fileList as it}
      <option value={it}>{it}</option>
      {/each}
    </select>
  </div>
  <div class="main" bind:this={dropAreaElement}>
    <div id="droparea">Click, tap or drop image to start painting</div>
    <input accept="image/png, image/jpeg, image/bmp, image/*" bind:files class="fileSelect" bind:this={fileSelect} type="file" />
  </div>
  <div class="container" bind:this={contentNode}>
    <svg id="svg2"></svg>
    {#if src}
    <img onload={imageOnLoad} bind:this={imageNode} src={src} class="fromImg" alt="svetof" />
    {/if}

  </div>

</main>

<style>
.card {
  color: white;
  padding: 1rem;
}
.card select {
  min-width: 10rem;
  color: black;
}
.fileSelect {
  display: none;
}
:global(main div.container svg),
:global(main div.container img) {
  opacity: 0;
}
:global(main.contOn div.container svg),
:global(main.imgOn div.container img) {
  opacity: 1;
}
</style>
