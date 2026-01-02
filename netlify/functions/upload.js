// Cloudinary Upload Function for Netlify
const { v2: cloudinary } = require('cloudinary');
const Busboy = require('busboy');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET,
});

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Check if Cloudinary is configured
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary configuration missing!');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Upload service not configured',
          message: 'Cloudinary credentials are missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Netlify environment variables.'
        })
      };
    }

    // Parse multipart form data
    return new Promise((resolve) => {
      const busboy = Busboy({ headers: event.headers });
      const chunks = [];
      let filename = '';
      let mimetype = '';

      busboy.on('file', (fieldname, file, info) => {
        filename = info.filename;
        mimetype = info.mimeType;

        file.on('data', (data) => {
          chunks.push(data);
        });

        file.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(2);

            console.log('📦 File received:', {
              name: filename,
              size: `${buffer.length} bytes (${fileSizeMB}MB)`,
              mimetype: mimetype,
              chunkCount: chunks.length
            });

            // Check file size (10MB limit)
            if (buffer.length > 10 * 1024 * 1024) {
              throw new Error(`File too large: ${fileSizeMB}MB (max 10MB)`);
            }

            console.log('☁️ Uploading to Cloudinary...');

            // Upload to Cloudinary
            const uploadResult = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'warranty-claims',
                  resource_type: 'auto',
                  allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx'],
                },
                (error, result) => {
                  if (error) {
                    console.error('❌ Cloudinary upload error:', {
                      message: error.message,
                      http_code: error.http_code,
                      name: error.name,
                      error: error
                    });
                    // Create more descriptive error
                    const errorMsg = error.http_code 
                      ? `Cloudinary error (${error.http_code}): ${error.message}`
                      : `Cloudinary error: ${error.message || 'Unknown error'}`;
                    reject(new Error(errorMsg));
                  } else if (!result) {
                    reject(new Error('Cloudinary upload failed: No result returned'));
                  } else {
                    resolve(result);
                  }
                }
              );

              uploadStream.on('error', (error) => {
                console.error('Upload stream error:', error);
                reject(error);
              });

              uploadStream.end(buffer);
            });

            // Determine file type
            let fileType = 'DOCUMENT';
            if (uploadResult.resource_type === 'image') {
              fileType = 'IMAGE';
            } else if (uploadResult.resource_type === 'video') {
              fileType = 'VIDEO';
            }

            console.log('✅ File uploaded successfully:', uploadResult.secure_url);

            // Clear chunks array to free memory
            chunks.length = 0;

            resolve({
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id,
                type: fileType,
                name: filename,
                size: uploadResult.bytes,
              })
            });
          } catch (error) {
            console.error('❌ Upload error:', error);
            console.error('Error details:', {
              message: error.message,
              stack: error.stack,
              name: error.name,
              code: error.code
            });
            resolve({
              statusCode: 500,
              headers,
              body: JSON.stringify({
                error: 'Upload failed',
                message: error.message || 'Unknown error occurred during upload',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                code: error.code || error.http_code
              })
            });
          }
        });
      });

      busboy.on('error', (error) => {
        console.error('Busboy error:', error);
        resolve({
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'File upload error',
            message: error.message
          })
        });
      });

      // Parse the request body
      if (event.body) {
        const isBase64 = event.isBase64Encoded;
        const body = isBase64 ? Buffer.from(event.body, 'base64') : event.body;
        busboy.write(body, isBase64 ? undefined : 'utf8');
        busboy.end();
      } else {
        resolve({
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No file provided' })
        });
      }
    });
  } catch (error) {
    console.error('❌ Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Upload failed',
        message: error.message || 'Unknown error occurred'
      })
    };
  }
};
























