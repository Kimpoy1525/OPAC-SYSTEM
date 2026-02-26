import Header from '../Header/header'
import Searchbar from '../SearchBar/searchbar'
import './upload.css'

const Upload = ({ setUser, user }) => {

  
  return (
    <main>
            <Header setUser={setUser} user={user} />

      <div className='upload-page'>
        <Searchbar/>

        <form className='upload-form'>
          <h2 className='form-header'>Upload Thesis / Capstone</h2>

          <div className='form-input'>
            <label>Research Title</label>
            <input type='text' placeholder='Enter research title' required/>
          </div>

          <div className='form-input'>
            <label>Author(s)</label>
            <input type='text' placeholder='Enter author name(s)' required/>
          </div>

          <div className='form-input'>
            <label>Year</label>
            <select>
              <option value={""}>Select Year</option>
              <option>2025</option>
              <option>2024</option>
            </select>
          </div>

          <div className='form-input'>
            <label>Abstract / Description</label>
            <textarea placeholder='Write a short description.....' rows={5} required/>
          </div>

          <div className='form-input'>
            <label>Panelists</label>
            <input type='text' placeholder='Enter panelist name(s)' required/>
          </div>

          <div className='form-input'>
            <label>Upload File (PDF, DOCX)</label>
            <div className='file-upload'>
              <input type='file' id='fileUpload' accept='.pdf, .docx' hidden/>
              <label htmlFor='fileUpload' className='file-btn'>Choose File</label>
              <span className='file-name'>No file chosen</span>
            </div>
          </div>

          <div className='select-program'>
            <button type='button' className='program-btn'>BSCS</button>
            <button type='button' className='program-btn'>BSIT</button>
            <button type='button' className='program-btn'>BSEMC</button>
          </div>

          <button type='submit' className='submit-btn'>SUBMIT</button>
        </form>
      </div>
       
    </main>
    
  )
}

export default Upload