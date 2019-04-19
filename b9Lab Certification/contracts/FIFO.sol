pragma solidity ^0.4.15;

contract FIFO {

    bytes32[] public fifoQueue;
    uint public cursorPosition;
    
    function queueDepth()
        public
        constant
        returns(uint depth)
    {
        return (fifoQueue.length - cursorPosition);
    }

    function push(bytes32 data) 
        public
        returns(uint size)
    {
        //if(fifoQueue.length + 1 < fifoQueue.length) throw; // exceeded 2^256 push requests
        require(!(fifoQueue.length + 1 < fifoQueue.length));

        return (fifoQueue.push(data) - 1);
    }

    function pop() 
        public
        returns(bytes32)
    {
        //if(fifoQueue.length==0) throw;
        require(fifoQueue.length>0);

        //if(fifoQueue.length - 1 < cursorPosition) throw;
        require(!(fifoQueue.length - 1 < cursorPosition));
        cursorPosition += 1;
        return (fifoQueue[cursorPosition-1]);
    }
}

