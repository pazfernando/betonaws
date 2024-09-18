#!/bin/bash
dnf install java -y
java -version
dnf install httpd -y
systemctl start httpd
echo "<h1>Greetings AWS builders</h1>" > /var/www/html/index.html
mkdir /var/www/html/stats
chmod 777 -R /var/www/html/stats
dnf install -y pip gcc python-devel python3-devel
cd /home/ec2-user
aws s3 cp ${s3UriAssetJMeter} ./${originalFileJMeter}
aws s3 cp ${s3UriAssetTaurus} ./${originalFileTaurus}
wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.6.3.tgz
tar -xvf apache-jmeter-5.6.3.tgz
chown -R ec2-user:ec2-user ./*
echo 'export PATH=/home/ec2-user/apache-jmeter-5.6.3/bin:$PATH' >> ./.bashrc
echo 'export APIURL=${apiEndpoint}' >> ./.bashrc
url=${apiEndpoint}
hostname=$(echo "$url" | cut -d/ -f3)
sudo -u ec2-user bash -c "sed -i \"s|%APIURL%|$hostname|g\" ./${originalFileTaurus}"
sudo -u ec2-user bash -c "pip install bzt"



    