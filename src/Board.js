import * as Jewels from './Jewels.js';

const Cols = 8;
const Rows = 8;

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

  #drag;

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
          fall: 0,
        } );
      }
    }

    return board;
  }

  static testBoard( colorIndexArray ) {
    const board = new Board();

    const colors = Object.keys( Jewels.Info );

    colorIndexArray.forEach( ( colorIndex, pieceIndex ) => {
      const col = pieceIndex % Cols;
      const row = Math.floor( pieceIndex / Cols );

      board.pieces.push( {
        type: colors[ colorIndex ],
        x: col,
        y: row,
        dx: 0,
        dy: 0,
        fall: 0,
      } );
    } );

    return board;
  }

  update( dt ) {
    let doneUpdating = true;

    // Dragging or snapping
    if ( this.#drag?.goal ) {
      const cx = this.#drag.goal.x - this.#drag.x;
      const cy = this.#drag.goal.y - this.#drag.y;
      const dist = Math.hypot( cx, cy );

      if ( dist < 0.001 ) {
        const move = {
          col: this.#drag.selected.x,
          row: this.#drag.selected.y,
          dx: this.#drag.goal.x,
          dy: this.#drag.goal.y,
        };

        this.applyMove( move );

        this.#drag = null;
      }
      else {
        // TODO: Start fast then slow down
        const p = 1 / ( 1 + 100 * Math.pow( dist, 2 ) );

        this.#drag.x += p * cx;
        this.#drag.y += p * cy;

        doneUpdating = false;
      }
    }

    // Falling
    this.pieces.filter( p => p.fall > 0 ).forEach( p => {
      const fallDist = p.dy * dt + 0.5 * Gravity * dt ** 2;

      if ( fallDist < p.fall ) {
        p.y += fallDist;
        p.dy += Gravity * dt;
        p.fall -= fallDist;

        doneUpdating = false;
      }
      else {
        p.y = Math.round( p.y + p.fall );
        p.dy = 0;
        p.fall = 0;
      }
    } );

    this.particles.forEach( part => {
      part.x += part.dx * dt;
      part.y += part.dy * dt + 0.5 * Gravity * dt ** 2;
      part.angle += part.dAngle * dt;
      part.alpha = Math.max( 0, part.alpha - 0.001 * dt );

      part.dy += Gravity * dt;
    } );
    
    this.particles = this.particles.filter( p => p.y < Rows );

    if ( doneUpdating ) {
      doneUpdating = !this.checkWins();
    }

    this.readyForInput = doneUpdating;

    return !doneUpdating || this.particles.length > 0;
  }

  draw( ctx ) {

    ctx.strokeStyle = 'gray';
    ctx.stroke( GridPath );
  
    this.pieces.forEach( piece => {
      let x = piece.x;
      let y = piece.y;

      if ( this.#drag ) {
        if ( piece == this.#drag.selected ) {
          x += this.#drag.x;
          y += this.#drag.y;
        }
        else if ( piece == this.#drag.other ) {
          x -= this.#drag.x;
          y -= this.#drag.y;
        }
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

  findRemovalsAt( col, row ) {
    const pieceArray = Array( Cols * Rows );
    const toRemove = new Set();

    this.pieces.forEach( p => pieceArray[ p.x + p.y * Cols ] = p );

    const startPiece = pieceArray[ col + row * Cols ];
    if ( !startPiece ) {
      debugger;
      return;
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

    return toRemove;
  }

  isValidMove( move ) {
    const selected = this.pieces.find( p => p.x == move.col && p.y == move.row );
    const other = this.pieces.find( p => p.x == move.col + move.dx && p.y == move.row + move.dy );

    // Test out move
    selected.x += move.dx;
    selected.y += move.dy;

    other.x -= move.dx;
    other.y -= move.dy;

    // Check for lines (should only need to check at affected spots)
    const isValid = this.findRemovalsAt( selected.x, selected.y ).size > 0 ||
                    this.findRemovalsAt( other.x,    other.y    ).size > 0;

    // Put everything back
    other.x += move.dx;
    other.y += move.dy;

    selected.x -= move.dx;
    selected.y -= move.dy;

    return isValid;
  }

  applyMove( move ) {
    const selected = this.pieces.find( p => p.x == move.col && p.y == move.row );
    const other = this.pieces.find( p => p.x == move.col + move.dx && p.y == move.row + move.dy );

    selected.x += move.dx;
    selected.y += move.dy;

    other.x -= move.dx;
    other.y -= move.dy;
  }

  // TODO: Better name!
  checkWins() {
    const pieceArray = Array( Cols * Rows );
    const toRemove = new Set();

    this.pieces.forEach( p => pieceArray[ p.x + p.y * Cols ] = p );

    // console.log( pieceArray );

    for ( let row = 0; row < Rows; row ++ ) { 
      for ( let col = 0; col < Cols; col ++ ) {
        this.findRemovalsAt( col, row ).forEach( r => toRemove.add( r ) );
      }
    }

    this.pieces = this.pieces.filter( p => !toRemove.has( p ) );

    // Sort the rows and add new pieces above
    const byCol = new Map();
    toRemove.forEach( p => {
      if ( !byCol.has( p.x ) ) {
        byCol.set( p.x, [] );
      }
      byCol.get( p.x ).push( p );
    } );

    const sortedCols = [ ...byCol.keys() ].sort().reverse();
    
    sortedCols.forEach( col => {
      byCol.get( col ).forEach( ( p, index ) => {
        this.pieces.push( {
          type: Jewels.getRandomType(),
          x: col,
          y: -1 - index,
          dx: 0,
          dy: 0,
          fall: 0,
        } );
      } );
    } );

    // Add to fall distance for pieces above removed pieces
    toRemove.forEach( r => {
      this.pieces.filter( p => p.x == r.x && p.y < r.y ).forEach( p => {
        p.fall += 1;
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

    this.#drag = {
      selected: this.pieces.find( p => Math.hypot( x - p.x, y - p.y ) < 0.5 ),
      other: null,
      axis: null,
      x: 0,
      y: 0,
    };
  }

  moveDrag( dx, dy ) {
    if ( !this.#drag ) {
      return;
    }

    const MIN_DRAG = 0.01;
    if ( Math.abs( this.#drag.x ) < MIN_DRAG && Math.abs( this.#drag.y ) < MIN_DRAG ) {
      this.#drag.axis = Math.abs( dx ) > Math.abs( dy ) ? Axis.Horizontal : Axis.Vertical;
      this.#drag.x = 0;
      this.#drag.y = 0;
    }

    this.#drag.x = Math.max( -1, Math.min( 1, this.#drag.x + this.#drag.axis.x * dx ) );
    this.#drag.y = Math.max( -1, Math.min( 1, this.#drag.y + this.#drag.axis.y * dy ) );

    this.#drag.other = this.pieces.find( p => 
      p.x == this.#drag.selected.x + Math.sign( this.#drag.x ) && 
      p.y == this.#drag.selected.y + Math.sign( this.#drag.y ) 
    );

    // An invalid drag counts as no drag at all
    // This makes dragging around edges and corners look better, so we can immediately choose a different axis
    if ( this.#drag.other == null ) {
      this.#drag.x = 0;
      this.#drag.y = 0;
    }
  }

  stopDrag() {
    if ( !this.#drag ) {
      return;
    }

    // Default to going back home, unless we end up having a valid move
    this.#drag.goal = { x: 0, y: 0 };

    const finalMoveX = Math.round( this.#drag.x );
    const finalMoveY = Math.round( this.#drag.y );

    if ( finalMoveX != 0 || finalMoveY != 0 ) {
      const proposedMove = {
        col: this.#drag.selected.x,
        row: this.#drag.selected.y,
        dx: finalMoveX,
        dy: finalMoveY,
      };

      if ( this.isValidMove( proposedMove ) ) {
        this.#drag.goal = { x: finalMoveX, y: finalMoveY };
      }
    }
  }
}
