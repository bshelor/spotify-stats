export const template = `
  <table style="padding: 15px; margin-right: auto; margin-left: auto;  font-family: trebuchetms; text-align: center;">
    <tr>
      <th><font size="+3">Weekly Artist Rankings Report</font></th>
    </tr>

    <tr>
      <th><i>{{date}}</i></th>
    </tr>

    <tr>
      <th><font size="+1">Here is this week's Top 10</font></th>
    </tr>

    <tr>
      <table style="margin-right: auto; margin-left: auto; font-family: trebuchetms; border: 1px solid black; border-collapse: collapse; padding: 10px;">

        <tr>
          <th style="border: 1px solid black; border-collapse: collapse; padding: 10px;">Rank</th>
          <th style="border: 1px solid black; border-collapse: collapse; padding: 10px;">Artist</th>
          <th style="border: 1px solid black; border-collapse: collapse; padding: 10px;">Popularity</th>
          <th style="border: 1px solid black; border-collapse: collapse; padding: 10px;">Genres</th>
          <th style="border: 1px solid black; border-collapse: collapse; padding: 10px;">Page Link</th>
        </tr>

        <tr>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px; text-align: center;">1</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{name1}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{popularity1}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{genres1}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;"><a href={{pageLink1}}>Page Link</a></td>
        </tr>

        <tr>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px; text-align: center;">2</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{name2}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{popularity2}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{genres2}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;"><a href={{pageLink2}}>Page Link</a></td>
        </tr>

        <tr>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px; text-align: center;">3</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{name3}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{popularity3}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{genres3}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;"><a href={{pageLink3}}>Page Link</a></td>
        </tr>

        <tr>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px; text-align: center;">4</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{name4}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{popularity4}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{genres4}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;"><a href={{pageLink4}}>Page Link</a></td>
        </tr>

        <tr>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px; text-align: center;">5</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{name5}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{popularity5}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{genres5}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;"><a href={{pageLink5}}>Page Link</a></td>
        </tr>

        <tr>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px; text-align: center;">6</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{name6}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{popularity6}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{genres6}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;"><a href={{pageLink6}}>Page Link</a></td>
        </tr>

        <tr>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px; text-align: center;">7</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{name7}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{popularity7}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{genres7}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;"><a href={{pageLink7}}>Page Link</a></td>
        </tr>

        <tr>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px; text-align: center;">8</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{name8}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{popularity8}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{genres8}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;"><a href={{pageLink8}}>Page Link</a></td>
        </tr>

        <tr>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px; text-align: center;">9</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{name9}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{popularity9}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{genres9}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;"><a href={{pageLink9}}>Page Link</a></td>
        </tr>

        <tr>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px; text-align: center;">10</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{name10}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{popularity10}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">{{genres10}}</td>
          <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;"><a href={{pageLink10}}>Page Link</a></td>
        </tr>
      </table>
    </tr>

    <tr>
      <p style="text-align: center;">View the full rankings in the attached file.</p>
      <p style="text-align: center;">Think an artist is missing? Let me know, I'm still working out the kinks on searching Spotify's API.</p>
    </tr>

    <tr>
      <br>
      <p style="text-align: center;"><i>Data sourced from Spotify</i></p>
    </tr>

  </table>
`;
