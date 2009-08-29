
<?php

$theaters = array("Los Gatos Cinema","Cinelux Plaza Theatre","Camera 7");
$movies = array("Transformers","Knocked Up","Live Free Die Hard");
$title = "-";
if ($_POST["zip"])
    $title = "Zip " . $_POST['zip'];
else
    $title = $_POST['movie'];
?>


<div>
    <div class="toolbar">
        <h1><?php echo $title ?></h1>
        <a href="#" class="button back">Back</a>
    </div>
    <ul class="edgetoedge">

    <?php
        if ($_POST["zip"])
        {
            foreach ($theaters as $theater)
            {
                echo '<li><a href="#theater">' . $theater . '</a></li>';
            }
        }
        else
            foreach ($movies as $movie)
            {
                echo '<li><a href="#movie">' . $movie . '</a></li>';
            }
    ?>
    </ul>
</div>

    <div id="theater" title="Theater" class="panel">
        <div class="toolbar">
            <h1>Theater Info</h1>
            <a href="#" class="button back">Back</a>
        </div>
        <div class="pad">
            <p>Lorem ipsum dolar...</p>
        </div>
    </div>

    <div id="movie" title="Movie" class="panel">
        <div class="toolbar">
            <h1>Movie Info</h1>
            <a href="#" class="button back">Back</a>
        </div>
        <div class="pad">
        <p>Lorem ipsum dolar...</p>            
        </div>

    </div>