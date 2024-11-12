export const Info = {
  'Red': ( () => {
    const outer = new Path2D();
    const inner = new Path2D();
  
    const EDGE = 0.6;
    [ [ -1, -EDGE ], [ -EDGE, -1 ], [ EDGE, -1 ], [ 1, -EDGE ], [ 0, 1 ] ].forEach( point => {
      outer.lineTo( ...point );
    } );
    outer.closePath();

    inner.addPath( outer );
  
    inner.moveTo( -1, -EDGE );
    inner.lineTo(  1, -EDGE );
  
    inner.moveTo( -0.3, -1 );
    inner.lineTo( -0.6, -EDGE );
    inner.lineTo( 0, 1 );
  
    inner.moveTo( 0.3, -1 );
    inner.lineTo( 0.6, -EDGE );
    inner.lineTo( 0, 1 );
  
    return {
      fillStyle: 'red',
      fill: outer,
      stroke: inner,
    }
  } )(),

  'Orange': ( () => {
    const points = getAngles( 0, Math.PI * 2, 8 ).map( angle =>
      [ Math.cos( angle ), Math.sin( angle ) ]
    );

    return {
      fillStyle: 'orange',
      fill: getPath( points ),
      stroke: getLayeredPath( points, 0.6 ),
    }
  } )(),

  'Yellow': ( () => {
    const points = getAngles( -Math.PI / 2, 3 * Math.PI / 2, 5 ).map( angle =>
      [ Math.cos( angle ), Math.sin( angle ) * 0.8 ]
    );

    return {
      fillStyle: 'yellow',
      fill: getPath( points ),
      stroke: getLayeredPath( points, 0.6 ),
    }
  } )(),

  'Blue': ( () => {
    const points = [];

    getAngles( -Math.PI / 2, Math.PI / 2, 6 ).forEach( angle => {
      points.push( [ Math.cos( angle ) * 0.6, Math.sin( angle ) ] );
    } );

    getAngles( Math.PI / 2, Math.PI * 3/2, 6 ).forEach( angle => {
      points.push( [ Math.cos( angle ) * 0.6, Math.sin( angle ) ] );
    } );

    return {
      fillStyle: 'dodgerblue',
      fill: getPath( points ),
      stroke: getLayeredPath( points, 0.6 ),
    }
  } )(),

  'White': ( () => {
    const points = getAngles( 0, Math.PI * 2, 4 ).map( angle =>
      [ Math.cos( angle ), Math.sin( angle ) ]
    );

    return {
      fillStyle: 'white',
      fill: getPath( points ),
      stroke: getLayeredPath( points, 0.6 ),
    }
  } )(),

  'Green': ( () => {
    const points = [];

    getAngles( -Math.PI, 0, 4 ).forEach( angle => {
      points.push( [ Math.cos( angle ) * 0.8, Math.sin( angle ) ] );
    } );
  
    getAngles( 0, Math.PI, 3 ).forEach( angle => {
      points.push( [ Math.cos( angle ) * 0.8, Math.sin( angle ) ] );
    } );

    return {
      fillStyle: 'limegreen',
      fill: getPath( points ),
      stroke: getLayeredPath( points, 0.6 ),
    }
  } )(),

  'Purple': ( () => {
    const points = [];

    getAngles( -Math.PI / 2, 3 * Math.PI / 2, 3 ).forEach( angle => {
      points.push( [ Math.cos( angle ), Math.sin( angle ) + 0.2 ] );
    } );

    return {
      fillStyle: 'violet',
      fill: getPath( points ),
      stroke: getLayeredPath( points, 0.6, 0, 0.2 ),
    }
  } )(),
}

function getPath( points ) {
  const path = new Path2D();
  points.forEach( p => path.lineTo( ...p ) );
  path.closePath();
  return path;
}

function getLayeredPath( points, innerSize, centerX = 0, centerY = 0 ) {
  const outer = new Path2D();
  const inner = new Path2D();
  const between = new Path2D();

  points.forEach( p => {
    outer.lineTo( ...p );

    const angle = Math.atan2( p[ 1 ] - centerY, p[ 0 ] - centerX );
    const dist  = Math.hypot( p[ 0 ] - centerX, p[ 1 ] - centerY );

    const innerX = centerX + Math.cos( angle ) * ( dist * innerSize );
    const innerY = centerY + Math.sin( angle ) * ( dist * innerSize );

    inner.lineTo( innerX, innerY );

    between.moveTo( ...p );
    between.lineTo( innerX, innerY );
  } );

  outer.closePath();
  inner.closePath();

  outer.addPath( between );
  outer.addPath( inner );
  
  return outer;
}

function getAngles( start, end, steps ) {
  return Array.from( Array( steps + 1 ), ( _, index ) => start + ( end - start ) * index / steps );
}

const jewelTypes = Object.keys( Info );
export function getRandomType() {
  return jewelTypes[ Math.floor( Math.random() * jewelTypes.length ) ]
}