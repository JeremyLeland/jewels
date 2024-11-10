import * as Jewels from './Jewels.js';

const Cols = 6;
const Rows = 6;

const GridPath = new Path2D();
for ( let x = 0; x <= Cols; x ++ ) {
  GridPath.moveTo( x - 0.5, 0 - 0.5 );
  GridPath.lineTo( x - 0.5, Rows - 0.5 );  
}
for ( let y = 0; y <= Rows; y ++ ) {
  GridPath.moveTo( 0 - 0.5, y - 0.5 );
  GridPath.lineTo( Cols - 0.5, y - 0.5 );
}

const Axis = {
  Horizontal: { x: 1, y: 0 },
  Vertical:   { x: 0, y: 1 },
};

const Gravity = 0.00001;

export class Board {
  pieces = [];
  particles = [];
  readyForInput = true;

  #selected = null;
  #other = null;
  #moveAxis = null;
  #moveX = 0;
  #moveY = 0;

  static randomBoard() {
    const board = new Board();

    for ( let y = 0; y < Rows; y ++ ) {
      for ( let x = 0; x < Cols; x ++ ) {
        board.pieces.push( {
          type: Jewels.getRandomType(),
          x: x,
          y: y,
          dx: 0,
          dy: 0,
        } );
      }
    }

    return board;
  }

  update( dt ) {
    let stillUpdating = false;

    this.pieces.forEach( piece => {

      // Gravity
      const belowDist = this.pieces.filter( other => other.x == piece.x )
        .map( other => other.y - piece.y - 1 )
        .reduce( ( closest, dist ) => -1 < dist && dist < closest ? dist : closest, Rows - piece.y - 1 );

      if ( belowDist > 0 ) {
        const fallDist = piece.dy * dt + 0.5 * Gravity * dt ** 2;

        if ( fallDist < belowDist ) {
          piece.y += fallDist;
          piece.dy += Gravity * dt;

          stillUpdating = true;
        }
        else {
          piece.y = Math.round( piece.y + belowDist );
          piece.dy = 0;
        }
      }
      
      // TODO: Snapping after drag
      // piece.x += piece.dx * dt;
      
    } );

    this.particles.forEach( part => {
      part.x += part.dx * dt;
      part.y += part.dy * dt + 0.5 * Gravity * dt ** 2;
      part.angle += part.dAngle * dt;
      part.alpha = Math.max( 0, part.alpha - 0.001 * dt );

      part.dy += Gravity * dt;
    } );
    
    this.particles = this.particles.filter( p => p.y < Rows );

    if ( !stillUpdating ) {
      stillUpdating = this.checkWins();
    }

    this.readyForInput = !stillUpdating;

    return stillUpdating || this.particles.length > 0;
  }

  draw( ctx ) {

    ctx.strokeStyle = 'gray';
    ctx.stroke( GridPath );
  
    this.pieces.forEach( piece => {
      let x = piece.x;
      let y = piece.y;

      if ( piece == this.#selected ) {
        x += this.#moveX;
        y += this.#moveY;
      }
      else if ( piece == this.#other ) {
        x -= this.#moveX;
        y -= this.#moveY;
      }

      ctx.translate( x, y );
      ctx.scale( 0.5, 0.5 ); {
        const info = Jewels.Info[ piece.type ];

        ctx.fillStyle = info.fillStyle;
        ctx.fill( info.fill );

        ctx.strokeStyle = 'black';
        ctx.stroke( info.stroke );
      }
      ctx.scale( 2, 2 );
      ctx.translate( -x, -y );
    } );

    this.particles.forEach( part => {
      ctx.translate( part.x, part.y );
      ctx.rotate( part.angle );
      ctx.globalAlpha = part.alpha; {
        const info = Jewels.Info[ part.type ];

        ctx.fillStyle = info.fillStyle;
        ctx.fillRect( -part.size / 2, -part.size / 2, part.size, part.size );

        ctx.strokeStyle = 'black';
        ctx.strokeRect( -part.size / 2, -part.size / 2, part.size, part.size );
        
      }
      ctx.globalAlpha = 1;
      ctx.rotate( -part.angle );
      ctx.translate( -part.x, -part.y );
    } );
  }

  // TODO: Better name!
  checkWins() {
    const pieceArray = Array( Cols * Rows );
    const toRemove = new Set();

    this.pieces.forEach( p => pieceArray[ p.x + p.y * Cols ] = p );

    // console.log( pieceArray );

    for ( let row = 0; row < Rows; row ++ ) { 
      for ( let col = 0; col < Cols; col ++ ) {
        const startPiece = pieceArray[ col + row * Cols ];
    
        if ( !startPiece ) {
          continue;
        }

        [
          [ 1, 0 ],   // vertical
          [ 0, 1 ],   // horizontal
        ].forEach( orientation => {
          let length = 1;
          const linePieces = [ startPiece ];
    
          [ -1, 1 ].forEach( dir => {
            let c = col, r = row;
    
            while ( true ) {
              c += dir * orientation[ 0 ];
              r += dir * orientation[ 1 ];
    
              if ( 0 <= c && c < Cols && 0 <= r && r < Rows ) {
                const otherPiece = pieceArray[ c + r * Cols ];

                if ( otherPiece?.type == startPiece.type ) {
                  length ++;
                  linePieces.push( otherPiece )
                }
                else {
                  break;
                }
              }
              else {
                break;
              }
            }
          } );

          if ( length >= 3 ) {
            toRemove.add( ...linePieces );
          }
        } );
      }
    }

    this.pieces = this.pieces.filter( p => !toRemove.has( p ) );

    // Sort the rows and add new pieces above
    const byRow = new Map();
    toRemove.forEach( p => {
      if ( !byRow.has( p.y ) ) {
        byRow.set( p.y, [] );
      }
      byRow.get( p.y ).push( p );
    } );

    const sortedRows = [ ...byRow.keys() ].sort().reverse();
    
    sortedRows.forEach( ( row, index ) => {
      byRow.get( row ).forEach( p => {
        this.pieces.push( {
          type: Jewels.getRandomType(),
          x: p.x,
          y: -1 - index,
          dx: 0,
          dy: 0,
        } );
      } );
    } );

    // Add particles
    toRemove.forEach( piece => {
      for ( let i = 0; i < 100; i ++ ) { 
        const dirAngle = Math.random() * Math.PI * 2;
        const speed = 0.001 + Math.random() * 0.003;
        const offset = Math.random() * 0.2;

        this.particles.push( {
          x: piece.x + Math.cos( dirAngle ) * offset,
          y: piece.y + Math.sin( dirAngle ) * offset,
          angle: Math.random() * Math.PI * 2,
          size: 0.01 + Math.random() * 0.07,
          alpha: 1,
          dx: Math.cos( dirAngle ) * speed,
          dy: Math.sin( dirAngle ) * speed,
          dAngle: 0.01 + Math.random() * 0.01,
          type: piece.type,
        } );
      }
    } );

    return toRemove.size > 0;
  }

  startDrag( x, y ) {
    if ( !this.readyForInput ) {
      return;
    }

    this.#selected = this.pieces.find( p => Math.hypot( x - p.x, y - p.y ) < 0.5 );
  }

  moveDrag( dx, dy ) {
    if ( !this.readyForInput ) {
      return;
    }

    if ( !this.#selected ) {
      return;
    }

    if ( Math.abs( this.#moveX ) < 0.01 && Math.abs( this.#moveY ) < 0.01 ) {
      this.#moveAxis = Math.abs( dx ) > Math.abs( dy ) ? Axis.Horizontal : Axis.Vertical;
      this.#moveX = 0;
      this.#moveY = 0;
    }

    this.#moveX = Math.max( -1, Math.min( 1, this.#moveX + this.#moveAxis.x * dx ) );
    this.#moveY = Math.max( -1, Math.min( 1, this.#moveY + this.#moveAxis.y * dy ) );

    this.#other = this.pieces.find( p => 
      p.x == this.#selected.x + Math.sign( this.#moveX ) && 
      p.y == this.#selected.y + Math.sign( this.#moveY ) 
    );

    // An invalid drag counts as no drag at all
    // This makes dragging around edges and corners look better, so we can immediately choose a different axis
    if ( this.#other == null ) {
      this.#moveX = 0;
      this.#moveY = 0;
    }
  }

  stopDrag() {
    if ( !this.readyForInput ) {
      return;
    }

    if ( this.#selected && this.#other ) { 
      const finalMoveX = Math.round( this.#moveX );
      const finalMoveY = Math.round( this.#moveY );

      this.#selected.x += finalMoveX;
      this.#selected.y += finalMoveY;

      this.#other.x -= finalMoveX;
      this.#other.y -= finalMoveY;
      
      // If we didn't make any lines, then put it back
      if ( !this.checkWins() ) {
        this.#selected.x -= finalMoveX;
        this.#selected.y -= finalMoveY;

        this.#other.x += finalMoveX;
        this.#other.y += finalMoveY;
      }
    }

    this.#selected = null;
    this.#other = null;
    
    this.#moveAxis = null;
    this.#moveX = 0;
    this.#moveY = 0;
  }
}
