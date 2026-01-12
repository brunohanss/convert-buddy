use std::cell::RefCell;
use std::collections::VecDeque;

/// Thread-local buffer pool to reduce allocations
/// Provides reusable buffers with automatic reset
pub struct BufferPool {
    pool: RefCell<VecDeque<Vec<u8>>>,
    max_pool_size: usize,
    default_capacity: usize,
}

impl BufferPool {
    /// Create a new buffer pool
    pub fn new(max_pool_size: usize, default_capacity: usize) -> Self {
        Self {
            pool: RefCell::new(VecDeque::with_capacity(max_pool_size)),
            max_pool_size,
            default_capacity,
        }
    }

    /// Acquire a buffer from the pool or create a new one
    pub fn acquire(&self) -> Vec<u8> {
        let mut pool = self.pool.borrow_mut();
        
        if let Some(mut buffer) = pool.pop_front() {
            buffer.clear();
            buffer
        } else {
            Vec::with_capacity(self.default_capacity)
        }
    }

    /// Acquire a buffer with specific capacity
    pub fn acquire_with_capacity(&self, capacity: usize) -> Vec<u8> {
        let mut pool = self.pool.borrow_mut();
        
        // Try to find a buffer with sufficient capacity
        for i in 0..pool.len() {
            if pool[i].capacity() >= capacity {
                let mut buffer = pool.remove(i).unwrap();
                buffer.clear();
                return buffer;
            }
        }
        
        // No suitable buffer found, create a new one
        Vec::with_capacity(capacity)
    }

    /// Release a buffer back to the pool
    pub fn release(&self, mut buffer: Vec<u8>) {
        // Only pool buffers that are not too large (avoid memory bloat)
        if buffer.capacity() <= self.default_capacity * 4 {
            buffer.clear();
            
            let mut pool = self.pool.borrow_mut();
            if pool.len() < self.max_pool_size {
                pool.push_back(buffer);
            }
        }
    }

    /// Get the current pool size
    pub fn size(&self) -> usize {
        self.pool.borrow().len()
    }

    /// Clear the pool
    pub fn clear(&self) {
        self.pool.borrow_mut().clear();
    }
}

impl Default for BufferPool {
    fn default() -> Self {
        Self::new(16, 64 * 1024) // Pool up to 16 buffers of 64KB each
    }
}

/// RAII wrapper for pooled buffers
pub struct PooledBuffer<'a> {
    buffer: Option<Vec<u8>>,
    pool: &'a BufferPool,
}

impl<'a> PooledBuffer<'a> {
    pub fn new(pool: &'a BufferPool) -> Self {
        Self {
            buffer: Some(pool.acquire()),
            pool,
        }
    }

    pub fn with_capacity(pool: &'a BufferPool, capacity: usize) -> Self {
        Self {
            buffer: Some(pool.acquire_with_capacity(capacity)),
            pool,
        }
    }

    /// Get a mutable reference to the buffer
    pub fn get_mut(&mut self) -> &mut Vec<u8> {
        self.buffer.as_mut().unwrap()
    }

    /// Get a reference to the buffer
    pub fn get(&self) -> &Vec<u8> {
        self.buffer.as_ref().unwrap()
    }

    /// Take the buffer out of the wrapper (consumes the wrapper)
    pub fn into_inner(mut self) -> Vec<u8> {
        self.buffer.take().unwrap()
    }
}

impl<'a> Drop for PooledBuffer<'a> {
    fn drop(&mut self) {
        if let Some(buffer) = self.buffer.take() {
            self.pool.release(buffer);
        }
    }
}

impl<'a> std::ops::Deref for PooledBuffer<'a> {
    type Target = Vec<u8>;

    fn deref(&self) -> &Self::Target {
        self.buffer.as_ref().unwrap()
    }
}

impl<'a> std::ops::DerefMut for PooledBuffer<'a> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        self.buffer.as_mut().unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_buffer_pool_acquire_release() {
        let pool = BufferPool::new(4, 1024);
        
        let buffer1 = pool.acquire();
        assert_eq!(buffer1.len(), 0);
        assert!(buffer1.capacity() >= 1024);
        
        pool.release(buffer1);
        assert_eq!(pool.size(), 1);
        
        let buffer2 = pool.acquire();
        pool.release(buffer2);
        assert_eq!(pool.size(), 1);
    }

    #[test]
    fn test_buffer_pool_capacity() {
        let pool = BufferPool::new(4, 1024);
        
        let buffer = pool.acquire_with_capacity(2048);
        assert!(buffer.capacity() >= 2048);
        
        pool.release(buffer);
        
        let buffer2 = pool.acquire_with_capacity(1500);
        assert!(buffer2.capacity() >= 1500);
    }

    #[test]
    fn test_buffer_pool_max_size() {
        let pool = BufferPool::new(2, 1024);
        
        pool.release(Vec::with_capacity(1024));
        pool.release(Vec::with_capacity(1024));
        pool.release(Vec::with_capacity(1024)); // Should not be added
        
        assert_eq!(pool.size(), 2);
    }

    #[test]
    fn test_pooled_buffer_raii() {
        let pool = BufferPool::new(4, 1024);
        
        {
            let mut buffer = PooledBuffer::new(&pool);
            buffer.push(42);
            assert_eq!(buffer[0], 42);
        } // Buffer automatically released here
        
        assert_eq!(pool.size(), 1);
        
        let mut buffer2 = PooledBuffer::new(&pool);
        assert_eq!(buffer2.len(), 0); // Should be cleared
    }
}
