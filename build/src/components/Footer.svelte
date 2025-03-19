<script lang="ts">
  const currentYear = new Date().getFullYear();
</script>

<footer class="footer text-center">
  <div class="container">
    <div class="text-center">
      <small class="copyright">
        Designed with <i class="fa fa-heart"></i> by 
        <a href="https://themes.3rdwavemedia.com/" target="_blank">Xiaoying Riley</a> for developers
      </small>
    </div>
    <div class="text-center mt-2">
      <small class="copyright">
        &copy; {currentYear} Kagi Inc. All rights reserved.
      </small>
    </div>
  </div>
</footer>

<style>
  .footer {
    background: #26a69a;
    color: #fff;
    padding: 15px 0;
  }
  
  .copyright {
    font-size: 14px;
    color: #fff;
  }
  
  .copyright a {
    color: #b3e9e9;
    text-decoration: none;
  }
  
  .copyright a:hover {
    text-decoration: underline;
  }
  
  .fa-heart {
    color: #ff76a9;
  }
</style> 